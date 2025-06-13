import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0,
    },

    setupNodeEvents(on, config) {
      // Task for database operations
      on('task', {
        async resetDatabase() {
          try {
            const response = await fetch(
              'http://localhost:3000/api/v1/test/reset',
              {
                method: 'POST',
              }
            );
            return response.ok;
          } catch (error) {
            console.error('Failed to reset database:', error);
            return false;
          }
        },

        async seedDatabase(data: Record<string, unknown>) {
          try {
            const response = await fetch(
              'http://localhost:3000/api/v1/test/seed',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              }
            );
            return response.ok;
          } catch (error) {
            console.error('Failed to seed database:', error);
            return false;
          }
        },

        log(message: string) {
          console.log(message);
          return null;
        },
      });

      return config;
    },

    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
  },

  env: {
    apiUrl: 'http://localhost:3000/api/v1',
    adminEmail: 'admin@feastfrenzy.com',
    adminPassword: 'Admin123!',
    managerEmail: 'manager@feastfrenzy.com',
    managerPassword: 'Manager123!',
    employeeEmail: 'employee@feastfrenzy.com',
    employeePassword: 'Employee123!',
  },
});
