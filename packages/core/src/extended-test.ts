import { test as base, expect as pwExpect } from '@playwright/test';

export const test = base.extend<{ _autoInterceptors: void }>({
  _autoInterceptors: [async ({ page }, use) => {
    // Read from env injected by defineConfig
    const interceptRequests = process.env.PW_EXT_INTERCEPT_REQUESTS === 'true';
    const interceptConsole = process.env.PW_EXT_INTERCEPT_CONSOLE === 'true';
    const interceptErrors = process.env.PW_EXT_INTERCEPT_ERRORS === 'true';
    const softFail = process.env.PW_EXT_SOFT_FAIL === 'true';

    if (interceptRequests) {
      page.on('request', request => {
        console.log(`[Request] ${request.method()} ${request.url()}`);
      });
      page.on('requestfailed', request => {
        const err = `[Request Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
        console.error(err);
        if (softFail) pwExpect.soft(true, err).toBe(false);
      });
    }

    if (interceptConsole) {
      page.on('console', msg => {
        console.log(`[Console ${msg.type()}] ${msg.text()}`);
      });
    }

    if (interceptErrors) {
      page.on('pageerror', exception => {
        const err = `[Page Error] ${exception.message}`;
        console.error(err);
        if (softFail) pwExpect.soft(true, err).toBe(false);
      });
    }

    await use();
  }, { auto: true }],
});

export const expect = pwExpect;
