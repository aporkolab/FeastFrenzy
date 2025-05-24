
/**
 * Query Analysis Script
 *
 * Runs EXPLAIN ANALYZE on common queries to verify index usage.
 * Use this to:
 * - Verify indexes are being used
 * - Find slow queries
 * - Identify missing indexes
 * - Benchmark query performance
 *
 * Usage:
 *   npm run analyze-queries
 *   node scripts/analyze-queries.js
 *   node scripts/analyze-queries.js --verbose
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
const verbose = process.argv.includes('--verbose');

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false,
  },
);

/**
 * Queries to analyze
 * Each query represents a common access pattern
 */
const QUERIES = [
  {
    name: 'Get all purchases (paginated)',
    description: 'Basic list query with ordering',
    sql: `
      EXPLAIN
      SELECT * FROM purchases
      ORDER BY date DESC
      LIMIT 20 OFFSET 0
    `,
    expectedIndex: 'idx_purchases_date',
  },
  {
    name: 'Get purchases by employee',
    description: 'Filter by employeeId (common in reports)',
    sql: `
      EXPLAIN
      SELECT * FROM purchases
      WHERE employeeId = 1
      ORDER BY date DESC
      LIMIT 20
    `,
    expectedIndex: 'idx_purchases_employee_date',
  },
  {
    name: 'Get purchases by user (ownership)',
    description: 'Filter by userId for ownership checks',
    sql: `
      EXPLAIN
      SELECT * FROM purchases
      WHERE userId = 1
      ORDER BY date DESC
      LIMIT 20
    `,
    expectedIndex: 'idx_purchases_user_id',
  },
  {
    name: 'Get open purchases by user',
    description: 'Common "my open purchases" query',
    sql: `
      EXPLAIN
      SELECT * FROM purchases
      WHERE userId = 1 AND closed = 0
      ORDER BY date DESC
    `,
    expectedIndex: 'idx_purchases_user_closed',
  },
  {
    name: 'Get purchases by date range',
    description: 'Date range filter for reports',
    sql: `
      EXPLAIN
      SELECT * FROM purchases
      WHERE date BETWEEN '2024-01-01' AND '2024-12-31'
      ORDER BY date DESC
    `,
    expectedIndex: 'idx_purchases_date',
  },
  {
    name: 'Get purchase items by purchase',
    description: 'Loading items for a purchase',
    sql: `
      EXPLAIN
      SELECT * FROM purchaseItems
      WHERE purchaseId = 1
    `,
    expectedIndex: 'idx_purchase_items_purchase_id',
  },
  {
    name: 'Get employee by employee_number',
    description: 'Lookup by unique identifier',
    sql: `
      EXPLAIN
      SELECT * FROM employees
      WHERE employee_number = 'EMP001'
    `,
    expectedIndex: 'idx_employees_employee_number',
  },
  {
    name: 'Get user by email',
    description: 'Login lookup',
    sql: `
      EXPLAIN
      SELECT * FROM users
      WHERE email = 'test@example.com'
    `,
    expectedIndex: 'idx_users_email',
  },
  {
    name: 'Get active users by role',
    description: 'Admin user management query',
    sql: `
      EXPLAIN
      SELECT * FROM users
      WHERE role = 'employee' AND isActive = 1
    `,
    expectedIndex: 'idx_users_role_active',
  },
  {
    name: 'Get audit logs by user and time',
    description: 'Audit trail for user actions',
    sql: `
      EXPLAIN
      SELECT * FROM audit_logs
      WHERE userId = 1
      ORDER BY timestamp DESC
      LIMIT 50
    `,
    expectedIndex: 'idx_audit_logs_user_timestamp',
  },
  {
    name: 'Get audit logs by resource',
    description: 'Find all actions on a resource',
    sql: `
      EXPLAIN
      SELECT * FROM audit_logs
      WHERE resource = 'purchase' AND resourceId = 1
      ORDER BY timestamp DESC
    `,
    expectedIndex: 'idx_audit_logs_resource_full',
  },
  {
    name: 'Get products by price range',
    description: 'Product filter by price',
    sql: `
      EXPLAIN
      SELECT * FROM products
      WHERE price BETWEEN 10.00 AND 50.00
      ORDER BY price ASC
    `,
    expectedIndex: 'idx_products_price',
  },
  {
    name: 'Join: Purchase with Employee',
    description: 'Common eager load pattern',
    sql: `
      EXPLAIN
      SELECT p.*, e.name as employee_name
      FROM purchases p
      LEFT JOIN employees e ON p.employeeId = e.id
      ORDER BY p.date DESC
      LIMIT 20
    `,
    expectedIndex: 'idx_purchases_date + PRIMARY',
  },
  {
    name: 'Join: Purchase Items with Products',
    description: 'Loading items with product details',
    sql: `
      EXPLAIN
      SELECT pi.*, pr.name, pr.price
      FROM purchaseItems pi
      JOIN products pr ON pi.productId = pr.id
      WHERE pi.purchaseId = 1
    `,
    expectedIndex: 'idx_purchase_items_purchase_id + PRIMARY',
  },
];

/**
 * Analyze EXPLAIN results
 */
function analyzeExplainResult(result) {
  if (!result || !result[0]) {
    return { type: 'UNKNOWN', warning: 'No EXPLAIN result' };
  }

  const row = result[0];
  const analysis = {
    type: row.type || row.select_type,
    possibleKeys: row.possible_keys,
    key: row.key,
    rows: row.rows,
    extra: row.Extra || row.extra,
  };

  // Warnings for poor performance
  analysis.warnings = [];

  if (!analysis.key) {
    analysis.warnings.push('⚠️  NO INDEX USED - Full table scan!');
  }

  if (analysis.type === 'ALL') {
    analysis.warnings.push('⚠️  FULL TABLE SCAN detected');
  }

  if (analysis.rows > 1000) {
    analysis.warnings.push(`⚠️  High row estimate: ${analysis.rows}`);
  }

  if (analysis.extra && analysis.extra.includes('filesort')) {
    analysis.warnings.push('⚠️  Using filesort (consider covering index)');
  }

  if (analysis.extra && analysis.extra.includes('temporary')) {
    analysis.warnings.push('⚠️  Using temporary table');
  }

  return analysis;
}

/**
 * Format results for console output
 */
function formatResult(query, result, analysis) {
  const lines = [];
  const separator = '─'.repeat(60);

  lines.push(`\n${separator}`);
  lines.push(`📊 ${query.name}`);
  lines.push(`   ${query.description}`);
  lines.push(separator);

  if (verbose) {
    lines.push(`\n   SQL: ${query.sql.trim().replace(/\s+/g, ' ')}\n`);
  }

  lines.push(`   Expected Index: ${query.expectedIndex}`);
  lines.push(`   Actual Key:     ${analysis.key || 'NONE'}`);
  lines.push(`   Access Type:    ${analysis.type}`);
  lines.push(`   Rows Scanned:   ${analysis.rows}`);

  if (analysis.possibleKeys && verbose) {
    lines.push(`   Possible Keys:  ${analysis.possibleKeys}`);
  }

  if (analysis.extra && verbose) {
    lines.push(`   Extra:          ${analysis.extra}`);
  }

  // Status
  const isOptimal = analysis.key && !analysis.warnings.length;
  lines.push(`\n   Status: ${isOptimal ? '✅ OPTIMAL' : '⚠️  NEEDS REVIEW'}`);

  // Warnings
  if (analysis.warnings.length > 0) {
    lines.push('');
    analysis.warnings.forEach(w => lines.push(`   ${w}`));
  }

  return lines.join('\n');
}

/**
 * Generate summary report
 */
function generateSummary(results) {
  const total = results.length;
  const optimal = results.filter(r => r.analysis.key && r.analysis.warnings.length === 0).length;
  const needsWork = total - optimal;

  const lines = [];
  lines.push(`\n${ '═'.repeat(60)}`);
  lines.push('📈 QUERY ANALYSIS SUMMARY');
  lines.push('═'.repeat(60));
  lines.push(`   Total Queries:  ${total}`);
  lines.push(`   Optimal:        ${optimal} (${((optimal / total) * 100).toFixed(0)}%)`);
  lines.push(`   Needs Review:   ${needsWork} (${((needsWork / total) * 100).toFixed(0)}%)`);

  if (needsWork > 0) {
    lines.push('\n   Queries needing attention:');
    results
      .filter(r => !r.analysis.key || r.analysis.warnings.length > 0)
      .forEach(r => {
        lines.push(`   - ${r.query.name}`);
      });
  }

  lines.push(`${'═'.repeat(60) }\n`);
  return lines.join('\n');
}

/**
 * List all indexes in the database
 */
async function listIndexes() {
  console.log('\n📋 Current Database Indexes:');
  console.log('─'.repeat(60));

  const tables = ['employees', 'products', 'purchases', 'purchaseItems', 'users', 'audit_logs'];

  for (const table of tables) {
    try {
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);

      if (indexes.length === 0) {
        console.log(`   ${table}: No indexes (only PRIMARY)`);
        continue;
      }

      console.log(`\n   ${table}:`);
      const indexNames = [...new Set(indexes.map(i => i.Key_name))];
      indexNames.forEach(name => {
        const cols = indexes
          .filter(i => i.Key_name === name)
          .map(i => i.Column_name)
          .join(', ');
        const unique = indexes.find(i => i.Key_name === name)?.Non_unique === 0 ? ' (UNIQUE)' : '';
        console.log(`      - ${name}: [${cols}]${unique}`);
      });
    } catch (error) {
      console.log(`   ${table}: Table not found or error - ${error.message}`);
    }
  }

  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 FeastFrenzy Query Analysis Tool');
  console.log('═'.repeat(60));
  console.log(`   Environment: ${env}`);
  console.log(`   Database:    ${dbConfig.database}`);
  console.log(`   Host:        ${dbConfig.host}`);
  console.log('═'.repeat(60));

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('\n✅ Database connection established\n');

    // List current indexes
    await listIndexes();

    // Run EXPLAIN for each query
    console.log('🔬 Running Query Analysis...');
    const results = [];

    for (const query of QUERIES) {
      try {
        const [result] = await sequelize.query(query.sql);
        const analysis = analyzeExplainResult(result);
        results.push({ query, result, analysis });
        console.log(formatResult(query, result, analysis));
      } catch (error) {
        console.log(`\n❌ Error analyzing "${query.name}": ${error.message}`);
        results.push({
          query,
          result: null,
          analysis: { key: null, warnings: [`Error: ${error.message}`] },
        });
      }
    }

    // Print summary
    console.log(generateSummary(results));
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('   Make sure the database is running and accessible.\n');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { QUERIES, analyzeExplainResult };
