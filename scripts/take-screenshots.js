#!/usr/bin/env node
/**
 * FeastFrenzy Screenshot Generator
 * 
 * Generates screenshots for README documentation using Puppeteer.
 * Run with: npm run screenshots (after starting the app with docker-compose up)
 * 
 * Prerequisites:
 *   - npm install puppeteer --save-dev (already in package.json)
 *   - Application running at http://localhost:4200
 *   - Backend running at http://localhost:3000
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.APP_URL || 'http://localhost:4200';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');

// Demo credentials (from seeders)
const CREDENTIALS = {
  admin: {
    email: 'admin@feastfrenzy.com',
    password: 'Admin123!'
  },
  manager: {
    email: 'manager@feastfrenzy.com', 
    password: 'Manager123!'
  },
  employee: {
    email: 'employee@feastfrenzy.com',
    password: 'Employee123!'
  }
};

// Screenshots to capture
const SCREENSHOTS = [
  // Public pages
  {
    name: 'login',
    url: '/login',
    auth: false,
    viewport: { width: 1280, height: 720 },
    waitFor: 'form',
    delay: 500
  },
  {
    name: 'register',
    url: '/register',
    auth: false,
    viewport: { width: 1280, height: 720 },
    waitFor: 'form',
    delay: 500
  },
  
  // Authenticated pages - Desktop
  {
    name: 'dashboard',
    url: '/dashboard',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 720 },
    waitFor: '.card',
    delay: 1000
  },
  {
    name: 'products-list',
    url: '/products',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 800 },
    waitFor: 'table, .card',
    delay: 1500
  },
  {
    name: 'product-form',
    url: '/products/new',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 800 },
    waitFor: 'form',
    delay: 1000
  },
  {
    name: 'employees-list',
    url: '/employees',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 800 },
    waitFor: 'table, .card',
    delay: 1500
  },
  {
    name: 'employee-form',
    url: '/employees/new',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 800 },
    waitFor: 'form',
    delay: 1000
  },
  {
    name: 'purchases-list',
    url: '/purchases',
    auth: true,
    role: 'admin',
    viewport: { width: 1280, height: 800 },
    waitFor: 'table, .card',
    delay: 1500
  },
  
  // Mobile responsive views
  {
    name: 'mobile-dashboard',
    url: '/dashboard',
    auth: true,
    role: 'admin',
    viewport: { width: 375, height: 667 }, // iPhone SE
    waitFor: '.card',
    delay: 1000
  },
  {
    name: 'mobile-products',
    url: '/products',
    auth: true,
    role: 'admin',
    viewport: { width: 375, height: 667 },
    waitFor: '.card, table',
    delay: 1500
  },
  {
    name: 'mobile-login',
    url: '/login',
    auth: false,
    viewport: { width: 375, height: 667 },
    waitFor: 'form',
    delay: 500
  },
  
  // Tablet view
  {
    name: 'tablet-dashboard',
    url: '/dashboard',
    auth: true,
    role: 'admin',
    viewport: { width: 768, height: 1024 }, // iPad
    waitFor: '.card',
    delay: 1000
  }
];

/**
 * Login to the application
 */
async function login(page, role = 'admin') {
  const creds = CREDENTIALS[role] || CREDENTIALS.admin;
  
  console.log(`  📝 Logging in as ${role}...`);
  
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  
  // Wait for login form
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill in credentials - using multiple selector strategies
  const emailSelector = 'input[type="email"], input#email, input[name="email"]';
  const passwordSelector = 'input[type="password"], input#password, input[name="password"]';
  
  await page.waitForSelector(emailSelector);
  await page.click(emailSelector);
  await page.type(emailSelector, creds.email, { delay: 50 });
  
  await page.waitForSelector(passwordSelector);
  await page.click(passwordSelector);
  await page.type(passwordSelector, creds.password, { delay: 50 });
  
  // Click submit button
  await page.click('button[type="submit"]');
  
  // Wait for navigation away from login page
  await page.waitForFunction(
    () => !window.location.href.includes('/login'),
    { timeout: 15000 }
  );
  
  // Additional wait to ensure auth state is fully established
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`  ✅ Logged in successfully as ${role}`);
}

/**
 * Take a single screenshot
 */
async function takeScreenshot(browser, screenshot, isAuthenticated = false) {
  const page = await browser.newPage();
  
  try {
    console.log(`\n📸 Taking screenshot: ${screenshot.name}`);
    
    // Set viewport
    await page.setViewport(screenshot.viewport);
    
    // Handle authentication if needed
    if (screenshot.auth && !isAuthenticated) {
      await login(page, screenshot.role);
    }
    
    // Navigate to the page
    console.log(`  🔗 Navigating to ${screenshot.url}`);
    await page.goto(`${BASE_URL}${screenshot.url}`, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for specific element if specified
    if (screenshot.waitFor) {
      try {
        await page.waitForSelector(screenshot.waitFor, { timeout: 10000 });
      } catch (e) {
        console.log(`  ⚠️  Warning: Could not find "${screenshot.waitFor}", proceeding anyway`);
      }
    }
    
    // Additional delay for animations/data loading
    if (screenshot.delay) {
      await new Promise(resolve => setTimeout(resolve, screenshot.delay));
    }
    
    // Execute custom action if specified
    if (screenshot.action) {
      await screenshot.action(page);
    }
    
    // Take screenshot
    const filepath = path.join(OUTPUT_DIR, `${screenshot.name}.png`);
    await page.screenshot({
      path: filepath,
      fullPage: false
    });
    
    console.log(`  ✅ Saved: ${filepath}`);
    
  } catch (error) {
    console.error(`  ❌ Error taking screenshot "${screenshot.name}":`, error.message);
  } finally {
    await page.close();
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 FeastFrenzy Screenshot Generator\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📁 Created output directory\n');
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });
  
  try {
    // Group screenshots by auth requirement for efficiency
    const publicScreenshots = SCREENSHOTS.filter(s => !s.auth);
    const authScreenshots = SCREENSHOTS.filter(s => s.auth);
    
    // Take public screenshots first
    console.log('='.repeat(50));
    console.log('📷 Taking PUBLIC page screenshots...');
    console.log('='.repeat(50));
    
    for (const screenshot of publicScreenshots) {
      await takeScreenshot(browser, screenshot);
    }
    
    // Take authenticated screenshots
    if (authScreenshots.length > 0) {
      console.log('\n' + '='.repeat(50));
      console.log('🔐 Taking AUTHENTICATED page screenshots...');
      console.log('='.repeat(50));
      
      // Create a persistent context for authenticated screenshots
      const authPage = await browser.newPage();
      await login(authPage, 'admin');
      
      // Store cookies/localStorage for reuse
      const cookies = await authPage.cookies();
      const localStorage = await authPage.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });
      
      await authPage.close();
      
      // Take authenticated screenshots with stored auth state
      for (const screenshot of authScreenshots) {
        const page = await browser.newPage();
        
        // Restore auth state
        await page.setCookie(...cookies);
        await page.evaluateOnNewDocument((storedItems) => {
          for (const [key, value] of Object.entries(storedItems)) {
            window.localStorage.setItem(key, value);
          }
        }, localStorage);
        
        try {
          console.log(`\n📸 Taking screenshot: ${screenshot.name}`);
          
          await page.setViewport(screenshot.viewport);
          
          console.log(`  🔗 Navigating to ${screenshot.url}`);
          await page.goto(`${BASE_URL}${screenshot.url}`, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          
          if (screenshot.waitFor) {
            try {
              await page.waitForSelector(screenshot.waitFor, { timeout: 10000 });
            } catch (e) {
              console.log(`  ⚠️  Warning: Could not find "${screenshot.waitFor}"`);
            }
          }
          
          if (screenshot.delay) {
            await new Promise(resolve => setTimeout(resolve, screenshot.delay));
          }
          
          if (screenshot.action) {
            await screenshot.action(page);
          }
          
          const filepath = path.join(OUTPUT_DIR, `${screenshot.name}.png`);
          await page.screenshot({ path: filepath, fullPage: false });
          
          console.log(`  ✅ Saved: ${filepath}`);
          
        } catch (error) {
          console.error(`  ❌ Error: ${error.message}`);
        } finally {
          await page.close();
        }
      }
    }
    
    // Generate summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
    console.log(`\n✅ Generated ${files.length} screenshots:\n`);
    files.forEach(f => console.log(`   - ${f}`));
    
    console.log(`\n📁 Screenshots saved to: ${OUTPUT_DIR}`);
    console.log('\n💡 Tip: Add these to your README.md:');
    console.log(`
## 📸 Screenshots

### Dashboard
<img src="docs/screenshots/dashboard.png" alt="Dashboard" width="800">

### Login
<img src="docs/screenshots/login.png" alt="Login" width="800">

### Products Management
<img src="docs/screenshots/products-list.png" alt="Products" width="800">

### Mobile Responsive
<p float="left">
  <img src="docs/screenshots/mobile-dashboard.png" alt="Mobile Dashboard" width="300">
  <img src="docs/screenshots/mobile-products.png" alt="Mobile Products" width="300">
</p>
`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
  
  console.log('\n🎉 Done!\n');
}

// Run the script
main().catch(console.error);
