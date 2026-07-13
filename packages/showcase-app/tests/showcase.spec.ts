import { test, expect, LocatorRace } from '@playwright-extensions/core';
import { InterceptorAction } from '@playwright-extensions/core';

test.describe('Showcase Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('handles unpredictable API outcome gracefully', async ({ page }) => {
    await page.click('#process-btn');
    
    // Wait for the spinner to appear before asserting
    await page.waitForSelector('#loading-spinner', { state: 'visible' });
    await expect(page.locator('#loading-spinner')).toBeVisible();

    // Now we wait to see which message appears first (success or error)
    const successMsg = page.locator('#success-message');
    const errorMsg = page.locator('#error-dialog');
    
    const winner = await LocatorRace.race([successMsg, errorMsg]);

    if (winner === successMsg) {
      await expect(page.locator('#success-message h3')).toContainText('Success');
      await page.click('.ok-btn');
    } else {
      await expect(page.locator('#error-dialog h3')).toContainText('Error');
      await page.click('.close-btn');
    }
  });

  test('demonstrates strict mode failure when multiple raced outcomes appear simultaneously', async ({ page }) => {
    test.fail(true, 'Test is expected to fail to demonstrate execution stoppage');
    // Inject both outcomes simultaneously into the DOM
    await page.click('#process-strict-fail-btn');
    
    // The default strict mode violation is thrown when the condition is satisfied ambiguously
    const successMsg = page.locator('#success-message');
    const errorMsg = page.locator('#error-dialog');
    
    await LocatorRace.race([successMsg, errorMsg]);

    // The execution strictly stops above, so these actions are never executed:
    console.log("This will never be logged to the console.");
    await page.locator('#execution-audit').textContent();
    await page.locator('#not-existing-element').click();
  });

  test('network interceptor (soft-fail + wildcard include) continues execution', async ({ page }) => {
    test.fail(true, 'Expected to fail due to soft-fail recording an error at test end');
    // This hits /api/fail-included which matches '*/api/fail-*' 
    // It's configured to soft-fail, so the test will be marked as failed at the end, 
    // BUT the execution of the test continues past this point!
    await page.click('#trigger-network-included');
    
    // Allow network failure to resolve
    await page.waitForTimeout(500); 
    
    // Demonstrate execution continued:
    await expect(page.locator('#trigger-network-included')).toBeVisible();
    await page.locator('#execution-audit').textContent();
    await expect(page.locator('#execution-audit')).toBeVisible();
  });

  test('network interceptor (excluded wildcard) ignores the failure entirely', async ({ page }) => {
    // This hits /api/fail-excluded. It matches the include rule BUT also matches the exclude ('*/fail-excluded')
    // So the interceptor should ignore it and no soft-fail will be triggered here. The test will PASS.
    await page.click('#trigger-network-excluded');
    await page.waitForTimeout(500); 
  });

  test('console interceptor (hard-fail) stops execution immediately', async ({ page }) => {
    test.fail(true, 'Expected to fail due to hard-fail immediately');
    // Console interceptor is set to 'fail'
    await page.click('#trigger-console-err');
    
    // Because it's a hard-fail, Playwright immediately aborts this test's execution sequence.
    // The next lines will NOT execute, which we prove by trying to change a button state
    await page.locator('#execution-audit').textContent();
    
    await page.waitForTimeout(500);
  });

  test('triggers page exception interceptor', async ({ page }) => {
    test.fail(true, 'Expected to fail due to hard-fail immediately');
    await page.click('#trigger-page-err');
    await page.waitForTimeout(500);
  });

  test.describe('Soft-Fail Interceptor Configurations', () => {
    test.use({
      interceptors: {
        console: { enabled: true, action: InterceptorAction.SoftFail },
        errors: { enabled: true, action: InterceptorAction.SoftFail }
      }
    });

    test('console interceptor as soft-fail continues execution', async ({ page }) => {
      test.fail(true, 'Expected to fail due to soft-fail at end of execution');
      await page.click('#trigger-console-err');
      
      // Soft fail allows continuation
      await page.waitForTimeout(100);
      await expect(page.locator('#trigger-console-err')).toBeVisible();
    });

    test('page exception interceptor as soft-fail continues execution', async ({ page }) => {
      test.fail(true, 'Expected to fail due to soft-fail at end of execution');
      await page.click('#trigger-page-err');
      
      // Soft fail allows continuation
      await page.waitForTimeout(100);
      await expect(page.locator('#trigger-page-err')).toBeVisible();
    });
  });

  test.describe('Hard-Fail Interceptor Configurations', () => {
    test.use({
      interceptors: {
        requests: { 
          enabled: true, 
          action: InterceptorAction.Fail, 
          statusCodes: ['5xx'], 
          include: ['*/api/fail-*'] 
        }
      }
    });

    test('network interceptor as hard-fail stops execution', async ({ page }) => {
      test.fail(true, 'Expected to stop execution');
      await page.click('#trigger-network-included');
      await page.waitForTimeout(500); // Allows interception to process and block test 
      
      // Will not reach this assertion
      await page.locator('#trigger-network-included').textContent();
    });
  });
});
