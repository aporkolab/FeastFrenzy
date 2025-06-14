/// <reference types="cypress" />
import './commands';
import 'cypress-axe';

// Hide fetch/XHR requests from command log for cleaner output
const app = window.top;
if (
  app &&
  !app.document.head.querySelector('[data-hide-command-log-request]')
) {
  const style = app.document.createElement('style');
  style.setAttribute('data-hide-command-log-request', '');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  app.document.head.appendChild(style);
}

// Global before each hook
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage();
  // Clear cookies
  cy.clearCookies();
});

// Global after each hook - capture screenshots on failure
afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    const testName = this.currentTest.title.replace(/\s+/g, '_');
    cy.screenshot(`failed_${testName}`, { capture: 'fullPage' });
  }
});

// Prevent Cypress from failing the test due to uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Returning false prevents Cypress from failing the test
  // Only suppress Angular-specific errors that don't affect test validity
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  if (err.message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
