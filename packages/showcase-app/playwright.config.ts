import { defineConfig, InterceptorAction } from '@playwright-extensions/core';
import { devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['@playwright-extensions/reporter', {
      serverUrl: process.env.REPORTER_SERVER_URL || 'http://localhost:8400',
      projectName: 'showcase-app',
      indexTraces: true
    }]
  ],

  /* Shared settings for all the projects below. */
  use: {
    baseURL: 'http://localhost:8300',
    trace: 'on-first-retry',
    
    // EXTENDED CORE CAPABILITIES 
    // Configured via the `use` scope so they can be overridden per project or per test!
    interceptors: {
      requests: {
        enabled: true,
        action: InterceptorAction.SoftFail, 
        statusCodes: ['5xx'], 
        include: ['*/api/fail-*'], 
        exclude: ['*/fail-excluded'] 
      },
      console: {
        enabled: true,
        action: InterceptorAction.Fail 
      },
      errors: {
        enabled: true,
        action: InterceptorAction.Fail
      }
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:8300',
    reuseExistingServer: !process.env.CI,
  },
});

