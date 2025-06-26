# 📸 Screenshots

This directory contains application screenshots for the README documentation.

## Generating Screenshots

Screenshots are auto-generated using Puppeteer. To create/update them:

### Prerequisites
- Application must be running (`docker-compose up`)
- Node.js 18+ installed
- Puppeteer installed (`npm install` at root level)

### Generate Screenshots

```bash
# From project root
npm run screenshots
```

This will:
1. Launch a headless browser
2. Navigate through the application
3. Capture screenshots at various viewports
4. Save them to this directory

### Expected Files

After running the script, you should have:

| File | Description | Viewport |
|------|-------------|----------|
| `login.png` | Login page | 1280×720 |
| `register.png` | Registration page | 1280×720 |
| `dashboard.png` | Main dashboard | 1280×720 |
| `products-list.png` | Products management | 1280×800 |
| `product-form.png` | Product create/edit form | 1280×800 |
| `employees-list.png` | Employees management | 1280×800 |
| `employee-form.png` | Employee create/edit form | 1280×800 |
| `purchases-list.png` | Purchase history | 1280×800 |
| `mobile-dashboard.png` | Dashboard (mobile) | 375×667 |
| `mobile-products.png` | Products (mobile) | 375×667 |
| `mobile-login.png` | Login (mobile) | 375×667 |
| `tablet-dashboard.png` | Dashboard (tablet) | 768×1024 |

### Manual Screenshots

If the automated script doesn't work, you can take screenshots manually:

1. Start the app: `docker-compose up`
2. Open Chrome DevTools (F12)
3. Click "Toggle device toolbar" (Ctrl+Shift+M)
4. Set viewport size
5. Navigate to desired page
6. Cmd/Ctrl + Shift + P → "Capture screenshot"
7. Save to this directory with appropriate name

### Troubleshooting

- **Screenshots are blank**: Wait longer for page load, increase delay in script
- **Auth errors**: Check that demo credentials in script match seeders
- **Network errors**: Ensure both frontend (4200) and backend (3000) are running
