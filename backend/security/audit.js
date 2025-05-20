const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

/**
 * Security Audit and Vulnerability Scanning
 * Provides comprehensive security checks and OWASP compliance validation
 */

class SecurityAuditor {
  constructor() {
    this.auditResults = new Map();
    this.lastAuditTime = null;
    this.auditConfig = {
      severity: {
        low: 1,
        moderate: 2,
        high: 3,
        critical: 4,
      },
      thresholds: {
        maxCritical: 0,
        maxHigh: 0,
        maxModerate: 5,
        maxLow: 10,
      },
    };
  }

  /**
   * Run comprehensive security audit
   */
  async runFullAudit() {
    logger.info('Starting comprehensive security audit...');

    const auditResults = {
      timestamp: new Date().toISOString(),
      passed: true,
      totalVulnerabilities: 0,
      vulnerabilities: {
        critical: [],
        high: [],
        moderate: [],
        low: [],
      },
      checks: {
        dependencies: null,
        secrets: null,
        headers: null,
        cors: null,
        authentication: null,
        authorization: null,
        inputValidation: null,
        rateLimiting: null,
        logging: null,
        errorHandling: null,
      },
      recommendations: [],
    };

    try {
      // Run individual security checks
      const checks = await Promise.allSettled([
        this.checkDependencyVulnerabilities(),
        this.scanForSecrets(),
        this.validateSecurityHeaders(),
        this.checkCORSConfiguration(),
        this.validateAuthentication(),
        this.checkAuthorization(),
        this.validateInputSanitization(),
        this.checkRateLimiting(),
        this.validateLogging(),
        this.checkErrorHandling(),
      ]);

      // Process check results
      const checkNames = [
        'dependencies', 'secrets', 'headers', 'cors',
        'authentication', 'authorization', 'inputValidation',
        'rateLimiting', 'logging', 'errorHandling',
      ];

      checks.forEach((check, index) => {
        const checkName = checkNames[index];

        if (check.status === 'fulfilled') {
          auditResults.checks[checkName] = check.value;

          // Aggregate vulnerabilities
          if (check.value.vulnerabilities) {
            Object.keys(check.value.vulnerabilities).forEach(severity => {
              auditResults.vulnerabilities[severity].push(...check.value.vulnerabilities[severity]);
              auditResults.totalVulnerabilities += check.value.vulnerabilities[severity].length;
            });
          }

          // Add recommendations
          if (check.value.recommendations) {
            auditResults.recommendations.push(...check.value.recommendations);
          }
        } else {
          auditResults.checks[checkName] = {
            passed: false,
            error: check.reason.message,
            vulnerabilities: { critical: [], high: [], moderate: [], low: [] },
          };
          logger.error(`Security check ${checkName} failed`, { error: check.reason });
        }
      });

      // Determine overall pass/fail status
      auditResults.passed = this.evaluateAuditResults(auditResults);

      // Save audit results
      await this.saveAuditResults(auditResults);

      logger.info('Security audit completed', {
        passed: auditResults.passed,
        totalVulnerabilities: auditResults.totalVulnerabilities,
        critical: auditResults.vulnerabilities.critical.length,
        high: auditResults.vulnerabilities.high.length,
        moderate: auditResults.vulnerabilities.moderate.length,
        low: auditResults.vulnerabilities.low.length,
      });

      return auditResults;

    } catch (error) {
      logger.error('Security audit failed', { error });
      auditResults.passed = false;
      auditResults.error = error.message;
      return auditResults;
    }
  }

  /**
   * Check for dependency vulnerabilities using npm audit
   */
  async checkDependencyVulnerabilities() {
    logger.debug('Checking dependency vulnerabilities...');

    try {
      const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
        cwd: process.cwd(),
      });

      const auditData = JSON.parse(stdout);
      const vulnerabilities = {
        critical: [],
        high: [],
        moderate: [],
        low: [],
      };

      // Parse npm audit results
      if (auditData.vulnerabilities) {
        Object.values(auditData.vulnerabilities).forEach(vuln => {
          const severity = vuln.severity.toLowerCase();
          if (vulnerabilities[severity]) {
            vulnerabilities[severity].push({
              name: vuln.name,
              severity: vuln.severity,
              range: vuln.range,
              via: vuln.via,
              fixAvailable: vuln.fixAvailable,
              description: `${vuln.name}: ${vuln.range}`,
            });
          }
        });
      }

      const totalVulnerabilities = Object.values(vulnerabilities).reduce((sum, arr) => sum + arr.length, 0);

      return {
        passed: totalVulnerabilities === 0,
        vulnerabilities,
        totalVulnerabilities,
        recommendations: totalVulnerabilities > 0 ? [
          'Run "npm audit fix" to automatically fix vulnerabilities',
          'Review and update dependencies regularly',
          'Consider using tools like Snyk or Dependabot for continuous monitoring',
        ] : [],
      };

    } catch (error) {
      logger.warn('NPM audit failed, trying alternative method', { error: error.message });

      // Fallback: check package.json for known vulnerable packages
      return this.checkKnownVulnerablePackages();
    }
  }

  /**
   * Scan for hardcoded secrets and sensitive information
   */
  async scanForSecrets() {
    logger.debug('Scanning for hardcoded secrets...');

    const secretPatterns = [
      { name: 'API Key', pattern: /api[_-]?key\s*[:=]\s*['""][^'""\s]{16,}['""]|[a-zA-Z0-9]{32,}/gi },
      { name: 'JWT Secret', pattern: /jwt[_-]?secret\s*[:=]\s*['""][^'""\s]{16,}['""]|eyJ[a-zA-Z0-9\-_]*/gi },
      { name: 'Database Password', pattern: /db[_-]?pass(?:word)?\s*[:=]\s*['""][^'""\s]+['""]|mysql:\/\/[^:\s]+:[^@\s]+@/gi },
      { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi },
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/gi },
      { name: 'Generic Secret', pattern: /secret\s*[:=]\s*['""][^'""\s]{8,}['""]|password\s*[:=]\s*['""][^'""\s]{6,}['""](?!.*example|.*test|.*demo)/gi },
    ];

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Files to scan (excluding node_modules, .git, etc.)
    const filesToScan = await this.getFilesToScan();

    for (const file of filesToScan) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        secretPatterns.forEach(({ name, pattern }) => {
          lines.forEach((line, lineNumber) => {
            const matches = line.match(pattern);
            if (matches) {
              // Skip obvious false positives
              if (this.isFalsePositive(line, name)) {
                return;
              }

              vulnerabilities.high.push({
                type: 'Hardcoded Secret',
                name,
                file: path.relative(process.cwd(), file),
                line: lineNumber + 1,
                description: `Potential ${name.toLowerCase()} found in source code`,
                recommendation: 'Move secrets to environment variables or secure secret management',
              });
            }
          });
        });
      } catch (error) {
        logger.warn(`Could not scan file ${file}`, { error: error.message });
      }
    }

    if (vulnerabilities.high.length > 0) {
      recommendations.push(
        'Move all secrets to environment variables',
        'Use a secret management service like AWS Secrets Manager or Azure Key Vault',
        'Add sensitive files to .gitignore',
        'Implement pre-commit hooks to prevent secret commits',
      );
    }

    return {
      passed: vulnerabilities.high.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Validate security headers configuration
   */
  async validateSecurityHeaders() {
    logger.debug('Validating security headers...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Check if security middleware is configured
    const securityMiddlewarePath = path.join(__dirname, '../utils/security-middleware.js');
    const helmetConfigured = fs.existsSync(securityMiddlewarePath);

    if (!helmetConfigured) {
      vulnerabilities.high.push({
        type: 'Missing Security Headers',
        name: 'Security Middleware Not Configured',
        description: 'Application lacks proper security headers middleware',
        recommendation: 'Configure Helmet.js or similar security middleware',
      });

      recommendations.push(
        'Install and configure Helmet.js for security headers',
        'Implement Content Security Policy (CSP)',
        'Enable HSTS for HTTPS connections',
        'Configure X-Frame-Options to prevent clickjacking',
      );
    } else {
      // Check if security middleware is properly configured
      try {
        const middlewareContent = fs.readFileSync(securityMiddlewarePath, 'utf8');
        const requiredHeaders = [
          'helmet',
          'contentSecurityPolicy',
          'hsts',
          'xssFilter',
          'noSniff',
        ];

        requiredHeaders.forEach(header => {
          if (!middlewareContent.includes(header)) {
            vulnerabilities.moderate.push({
              type: 'Security Header Configuration',
              name: `Missing ${header} configuration`,
              description: `Security header ${header} is not configured`,
              recommendation: `Configure ${header} in security middleware`,
            });
          }
        });
      } catch (error) {
        logger.warn('Could not analyze security middleware', { error: error.message });
      }
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Check CORS configuration
   */
  async checkCORSConfiguration() {
    logger.debug('Checking CORS configuration...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Look for CORS configuration in main files
    const mainFiles = ['server.js', 'index.js', 'app.js', 'server.prod.js'];
    let corsConfigured = false;
    let corsWildcard = false;

    for (const file of mainFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');

          if (content.includes('cors') || content.includes('Access-Control-Allow-Origin')) {
            corsConfigured = true;

            // Check for wildcard CORS
            if (content.includes('origin: "*"') || content.includes('Access-Control-Allow-Origin: *')) {
              corsWildcard = true;
            }
          }
        } catch (error) {
          logger.warn(`Could not analyze ${file}`, { error: error.message });
        }
      }
    }

    if (!corsConfigured) {
      vulnerabilities.moderate.push({
        type: 'CORS Configuration',
        name: 'CORS Not Configured',
        description: 'CORS middleware is not configured',
        recommendation: 'Configure CORS middleware with appropriate origin restrictions',
      });
    } else if (corsWildcard) {
      vulnerabilities.high.push({
        type: 'CORS Misconfiguration',
        name: 'Wildcard CORS Origin',
        description: 'CORS is configured with wildcard (*) origin, allowing requests from any domain',
        recommendation: 'Restrict CORS origins to specific trusted domains',
      });
    }

    if (corsWildcard) {
      recommendations.push(
        'Replace wildcard CORS with specific allowed origins',
        'Implement environment-specific CORS configuration',
        'Consider using credentials: true only with specific origins',
      );
    } else if (!corsConfigured) {
      recommendations.push(
        'Install and configure CORS middleware',
        'Define allowed origins based on your application requirements',
        'Consider different CORS policies for different environments',
      );
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Validate authentication implementation
   */
  async validateAuthentication() {
    logger.debug('Validating authentication implementation...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Check for JWT implementation
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (!dependencies['jsonwebtoken'] && !dependencies['passport']) {
        vulnerabilities.high.push({
          type: 'Authentication',
          name: 'No Authentication Library',
          description: 'No JWT or Passport authentication library found',
          recommendation: 'Implement proper authentication using JWT or Passport',
        });
      }

      // Check for bcrypt for password hashing
      if (!dependencies['bcrypt'] && !dependencies['bcryptjs'] && !dependencies['argon2']) {
        vulnerabilities.high.push({
          type: 'Password Security',
          name: 'No Password Hashing Library',
          description: 'No secure password hashing library found',
          recommendation: 'Use bcrypt, bcryptjs, or argon2 for password hashing',
        });
      }
    }

    // Check for authentication middleware
    const authMiddlewarePath = path.join(process.cwd(), 'middleware/auth.js');
    if (!fs.existsSync(authMiddlewarePath)) {
      vulnerabilities.moderate.push({
        type: 'Authentication Middleware',
        name: 'Missing Authentication Middleware',
        description: 'No authentication middleware found',
        recommendation: 'Implement JWT authentication middleware',
      });
    }

    if (vulnerabilities.high.length > 0 || vulnerabilities.moderate.length > 0) {
      recommendations.push(
        'Implement JWT-based authentication',
        'Use secure password hashing (bcrypt with salt rounds >= 12)',
        'Implement token refresh mechanism',
        'Add rate limiting to authentication endpoints',
        'Consider multi-factor authentication for admin users',
      );
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Check authorization and access control
   */
  async checkAuthorization() {
    logger.debug('Checking authorization and access control...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Check for role-based access control
    const routeFiles = await this.findRouteFiles();
    let rbacFound = false;
    const unprotectedAdminRoutes = [];

    for (const routeFile of routeFiles) {
      try {
        const content = fs.readFileSync(routeFile, 'utf8');

        // Check for role-based middleware
        if (content.includes('role') || content.includes('permission') || content.includes('authorize')) {
          rbacFound = true;
        }

        // Check for unprotected admin routes
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if ((line.includes('/admin') || line.includes('admin')) &&
              !line.includes('authenticate') && !line.includes('authorize') &&
              (line.includes('router.') || line.includes('app.'))) {
            unprotectedAdminRoutes.push({
              file: path.relative(process.cwd(), routeFile),
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      } catch (error) {
        logger.warn(`Could not analyze route file ${routeFile}`, { error: error.message });
      }
    }

    if (!rbacFound) {
      vulnerabilities.high.push({
        type: 'Authorization',
        name: 'Missing Role-Based Access Control',
        description: 'No role-based access control implementation found',
        recommendation: 'Implement RBAC with proper role and permission checking',
      });
    }

    unprotectedAdminRoutes.forEach(route => {
      vulnerabilities.critical.push({
        type: 'Access Control',
        name: 'Unprotected Admin Route',
        file: route.file,
        line: route.line,
        description: 'Admin route is not protected with authentication/authorization',
        recommendation: 'Add authentication and admin role check to this route',
      });
    });

    if (!rbacFound || unprotectedAdminRoutes.length > 0) {
      recommendations.push(
        'Implement role-based access control (RBAC)',
        'Protect all admin routes with proper authorization',
        'Use principle of least privilege',
        'Implement resource-based access control where needed',
        'Add audit logging for sensitive operations',
      );
    }

    return {
      passed: vulnerabilities.critical.length === 0 && vulnerabilities.high.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Validate input sanitization and validation
   */
  async validateInputSanitization() {
    logger.debug('Validating input sanitization...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for validation libraries
      const validationLibs = ['joi', 'yup', 'express-validator', 'ajv'];
      const hasValidation = validationLibs.some(lib => dependencies[lib]);

      if (!hasValidation) {
        vulnerabilities.high.push({
          type: 'Input Validation',
          name: 'No Input Validation Library',
          description: 'No input validation library found',
          recommendation: 'Use a validation library like Joi, Yup, or express-validator',
        });
      }

      // Check for sanitization libraries
      const sanitizationLibs = ['express-mongo-sanitize', 'xss', 'validator'];
      const hasSanitization = sanitizationLibs.some(lib => dependencies[lib]);

      if (!hasSanitization) {
        vulnerabilities.moderate.push({
          type: 'Input Sanitization',
          name: 'No Input Sanitization Library',
          description: 'No input sanitization library found',
          recommendation: 'Use sanitization libraries to prevent XSS and injection attacks',
        });
      }
    }

    // Check route files for SQL injection vulnerabilities
    const routeFiles = await this.findRouteFiles();
    for (const routeFile of routeFiles) {
      try {
        const content = fs.readFileSync(routeFile, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for potential SQL injection
          if ((line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE') || line.includes('DELETE')) &&
              (line.includes('req.body') || line.includes('req.params') || line.includes('req.query')) &&
              !line.includes('?') && !line.includes('$')) {
            vulnerabilities.critical.push({
              type: 'SQL Injection',
              name: 'Potential SQL Injection Vulnerability',
              file: path.relative(process.cwd(), routeFile),
              line: index + 1,
              description: 'Raw SQL query with user input without parameterization',
              recommendation: 'Use parameterized queries or ORM methods',
            });
          }
        });
      } catch (error) {
        logger.warn(`Could not analyze route file ${routeFile}`, { error: error.message });
      }
    }

    if (vulnerabilities.critical.length > 0 || vulnerabilities.high.length > 0 || vulnerabilities.moderate.length > 0) {
      recommendations.push(
        'Implement comprehensive input validation for all endpoints',
        'Use parameterized queries to prevent SQL injection',
        'Sanitize all user inputs to prevent XSS attacks',
        'Validate data types, formats, and ranges',
        'Use whitelist-based validation rather than blacklist',
      );
    }

    return {
      passed: vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Check rate limiting configuration
   */
  async checkRateLimiting() {
    logger.debug('Checking rate limiting configuration...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for rate limiting libraries
      const rateLimitLibs = ['express-rate-limit', 'express-slow-down', 'rate-limiter-flexible'];
      const hasRateLimit = rateLimitLibs.some(lib => dependencies[lib]);

      if (!hasRateLimit) {
        vulnerabilities.moderate.push({
          type: 'Rate Limiting',
          name: 'No Rate Limiting Library',
          description: 'No rate limiting library found',
          recommendation: 'Implement rate limiting to prevent abuse and DoS attacks',
        });

        recommendations.push(
          'Install express-rate-limit or similar rate limiting middleware',
          'Configure different limits for different endpoint types',
          'Implement stricter limits for authentication endpoints',
          'Consider using Redis for distributed rate limiting',
        );
      }
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Validate logging configuration
   */
  async validateLogging() {
    logger.debug('Validating logging configuration...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Check if logging is configured
    const loggerPath = path.join(process.cwd(), 'utils/logger.js');
    if (!fs.existsSync(loggerPath)) {
      vulnerabilities.moderate.push({
        type: 'Security Logging',
        name: 'No Structured Logging',
        description: 'No structured logging implementation found',
        recommendation: 'Implement structured logging for security monitoring',
      });
    } else {
      try {
        const loggerContent = fs.readFileSync(loggerPath, 'utf8');

        // Check if security events are logged
        const securityEvents = ['login', 'logout', 'failed_auth', 'permission_denied', 'admin_action'];
        const missingEvents = securityEvents.filter(event => !loggerContent.includes(event));

        if (missingEvents.length > 0) {
          vulnerabilities.low.push({
            type: 'Security Logging',
            name: 'Incomplete Security Event Logging',
            description: `Missing logging for security events: ${missingEvents.join(', ')}`,
            recommendation: 'Log all security-relevant events for audit purposes',
          });
        }
      } catch (error) {
        logger.warn('Could not analyze logger configuration', { error: error.message });
      }
    }

    if (vulnerabilities.moderate.length > 0 || vulnerabilities.low.length > 0) {
      recommendations.push(
        'Implement structured logging with Winston or similar',
        'Log all authentication and authorization events',
        'Include request IDs for tracing',
        'Implement log rotation and secure storage',
        'Set up log monitoring and alerting',
      );
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Check error handling security
   */
  async checkErrorHandling() {
    logger.debug('Checking error handling security...');

    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };
    const recommendations = [];

    // Check main application files for error handling
    const mainFiles = ['server.js', 'index.js', 'app.js', 'server.prod.js'];
    let globalErrorHandler = false;
    let exposesStackTrace = false;

    for (const file of mainFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');

          // Check for global error handler
          if (content.includes('app.use') && content.includes('error') && content.includes('req, res, next')) {
            globalErrorHandler = true;
          }

          // Check if stack traces are exposed
          if (content.includes('error.stack') || content.includes('err.stack')) {
            exposesStackTrace = true;
          }
        } catch (error) {
          logger.warn(`Could not analyze ${file}`, { error: error.message });
        }
      }
    }

    if (!globalErrorHandler) {
      vulnerabilities.moderate.push({
        type: 'Error Handling',
        name: 'No Global Error Handler',
        description: 'No global error handler found',
        recommendation: 'Implement a global error handler to catch and properly handle all errors',
      });
    }

    if (exposesStackTrace) {
      vulnerabilities.high.push({
        type: 'Information Disclosure',
        name: 'Stack Trace Exposure',
        description: 'Application may expose stack traces in error responses',
        recommendation: 'Never expose stack traces in production responses',
      });
    }

    if (!globalErrorHandler || exposesStackTrace) {
      recommendations.push(
        'Implement a comprehensive global error handler',
        'Never expose stack traces or internal error details in production',
        'Log detailed errors server-side while sending generic messages to clients',
        'Implement proper error codes and user-friendly error messages',
        'Consider using error monitoring services like Sentry',
      );
    }

    return {
      passed: vulnerabilities.high.length === 0 && vulnerabilities.critical.length === 0,
      vulnerabilities,
      recommendations,
    };
  }

  /**
   * Helper: Get files to scan for secrets
   */
  async getFilesToScan() {
    const extensions = ['.js', '.ts', '.json', '.env', '.config', '.yml', '.yaml'];
    const excludeDirs = ['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'];
    const files = [];

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !excludeDirs.includes(item)) {
          scanDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };

    scanDir(process.cwd());
    return files;
  }

  /**
   * Helper: Check if a detected secret is a false positive
   */
  isFalsePositive(line, secretType) {
    const falsePositives = [
      'example', 'test', 'demo', 'placeholder', 'YOUR_', 'REPLACE_',
      'TODO', 'FIXME', 'xxx', '***', '...',
    ];

    const lineUpper = line.toUpperCase();
    return falsePositives.some(fp => lineUpper.includes(fp.toUpperCase()));
  }

  /**
   * Helper: Find route files
   */
  async findRouteFiles() {
    const routeDirs = ['routes', 'controllers', 'api'];
    const files = [];

    routeDirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        const routeFiles = fs.readdirSync(dirPath)
          .filter(file => file.endsWith('.js'))
          .map(file => path.join(dirPath, file));
        files.push(...routeFiles);
      }
    });

    return files;
  }

  /**
   * Helper: Check for known vulnerable packages
   */
  async checkKnownVulnerablePackages() {
    const knownVulnerable = {
      'lodash': ['4.17.20', 'Prototype Pollution'],
      'moment': ['2.29.1', 'Regular Expression DoS'],
      'debug': ['4.3.1', 'Regular Expression DoS'],
      'mongoose': ['5.13.2', 'Prototype Pollution'],
    };

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const vulnerabilities = { critical: [], high: [], moderate: [], low: [] };

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      Object.entries(knownVulnerable).forEach(([pkg, [version, vuln]]) => {
        if (dependencies[pkg]) {
          vulnerabilities.moderate.push({
            name: pkg,
            version: dependencies[pkg],
            vulnerability: vuln,
            description: `${pkg} may have known vulnerabilities`,
            recommendation: `Update ${pkg} to latest version`,
          });
        }
      });
    }

    return {
      passed: vulnerabilities.moderate.length === 0,
      vulnerabilities,
      recommendations: vulnerabilities.moderate.length > 0 ? [
        'Update all dependencies to latest versions',
        'Use npm audit or yarn audit regularly',
        'Consider using automated dependency update tools',
      ] : [],
    };
  }

  /**
   * Helper: Evaluate overall audit results
   */
  evaluateAuditResults(results) {
    const { critical, high, moderate, low } = results.vulnerabilities;
    const { thresholds } = this.auditConfig;

    return (
      critical.length <= thresholds.maxCritical &&
      high.length <= thresholds.maxHigh &&
      moderate.length <= thresholds.maxModerate &&
      low.length <= thresholds.maxLow
    );
  }

  /**
   * Helper: Save audit results
   */
  async saveAuditResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'security', 'audit-results');

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `security-audit-${timestamp}.json`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

      // Keep only the last 10 audit results
      const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('security-audit-'))
        .sort()
        .reverse();

      if (files.length > 10) {
        files.slice(10).forEach(file => {
          fs.unlinkSync(path.join(outputDir, file));
        });
      }

      logger.info(`Security audit results saved to ${filepath}`);
    } catch (error) {
      logger.warn('Could not save audit results', { error: error.message });
    }
  }

  /**
   * Generate security audit report
   */
  generateReport(results) {
    const report = {
      summary: {
        timestamp: results.timestamp,
        passed: results.passed,
        totalVulnerabilities: results.totalVulnerabilities,
        severityBreakdown: {
          critical: results.vulnerabilities.critical.length,
          high: results.vulnerabilities.high.length,
          moderate: results.vulnerabilities.moderate.length,
          low: results.vulnerabilities.low.length,
        },
      },
      checkResults: results.checks,
      recommendations: results.recommendations,
      vulnerabilities: results.vulnerabilities,
    };

    return report;
  }
}

// Export singleton instance
const securityAuditor = new SecurityAuditor();

module.exports = {
  securityAuditor,
  SecurityAuditor,
};
