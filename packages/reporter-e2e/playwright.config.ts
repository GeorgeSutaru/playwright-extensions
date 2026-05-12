import { defineConfig } from '@playwright-extensions/core';
import { devices } from '@playwright/test';
import * as dotenv from 'dotenv';

import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['@playwright-extensions/reporter', {
      serverUrl: process.env.REPORTER_SERVER_URL,
      projectName: 'reporter-e2e',
    }]
  ],
  use: {
    trace: 'on',
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
