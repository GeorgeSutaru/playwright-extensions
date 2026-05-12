import { defineConfig } from './src/config';
import { devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['@playwright-extensions/reporter', {
      serverUrl: process.env.REPORTER_SERVER_URL || 'http://localhost:8400',
      projectName: 'core',
    }]
  ],
  use: {
    trace: 'on-first-retry',
    interceptors: {
      requests: true,
      console: true,
      errors: true,
      softFail: true,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

