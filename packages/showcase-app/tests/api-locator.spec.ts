import { test, expect } from '@playwright-extensions/core';

test.describe('Showcase Application - apiLocator', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('locates dynamic UI text purely from the network response payload using jsonpath', async ({ page }) => {
    // 1. Click the button to fire the API call
    await page.click('#fetch-user-btn');

    // 2. We don't hardcode 'Welcome Alice!', we use apiLocator to figure out the value 
    //    straight from the intercepted `/api/user` response JSON payload at `$.data.user.name`
    //    It waits until the network response completes, extracts 'Alice', then executes page.getByText('Alice')
    const dynamicLoc = page.locator('/api/user', '$.data.user.name', 'json');
    
    // We expect the 'Welcome Alice!' UI container to be visible and hold text matching our dynamic username.
    await expect(page.locator('#user-message').locator('/api/user', '$.data.user.name','json')).toBeVisible();
    await expect(page.locator('#user-message')).toContainText(await dynamicLoc.innerText());
  });

  test('locates dynamic UI text purely from the network response payload using xml', async ({ page }) => {
    await page.click('#fetch-product-btn');

    // Extracts 'Widget X' from <Product><Name>Widget X</Name></Product> and scopes it strictly under the #product-message container
    const dynamicLoc = page.locator('#product-message').locator('/api/product', '$.Catalog.Product.Name', 'xml');
    
    await expect(dynamicLoc).toBeVisible();
    await expect(page.locator('#product-message')).toContainText(await dynamicLoc.innerText());
  });

  test('locates dynamic UI text purely from the network response payload using regex', async ({ page }) => {
    await page.click('#fetch-status-btn');

    // Uses a regex group exactly matching "system operational" from "Server Status: ACTIVE system operational"
    const dynamicLoc = page.locator('#status-message').locator('/api/status', 'Server Status: ACTIVE (.*)', 'regex');
    
    await expect(dynamicLoc).toBeVisible();
    await expect(page.locator('#status-message')).toContainText(await dynamicLoc.innerText());
  });
  
});

  test('throws meaningful error if payload does not contain the specified path', async ({ page }) => {
    // Manually trigger the missing path API since it's just for error validation
    await page.evaluate(() => { fetch('http://localhost:8300/api/missing-path'); });

    const dynamicLoc = page.locator('/api/missing-path', '$.data.user.name', 'json');
    
    // Expect the promise/action on the locator to reject gracefully
    const errorMsg = await dynamicLoc.innerText().catch(e => e.message);
    
    expect(errorMsg).toContain('locator: Could not extract value for path "$.data.user.name" from response matching /api/missing-path');
    expect(errorMsg).toContain('{"data":{"unrelated":true}}'); // Should include matched body
  });

  test('throws meaningful error containing HTTP status code if the endpoint fails', async ({ page }) => {
    // Manually trigger the 500 error API 
    await page.evaluate(() => { fetch('http://localhost:8300/api/error-code'); });

    const dynamicLoc = page.locator('/api/error-code', '$.data.user.name', 'json');
    
    // We expect the extraction to fail, but because it's a 500 status, we also report the status code.
    const errorMsg = await dynamicLoc.innerText().catch(e => e.message);
    
    expect(errorMsg).toContain('locator: Request to /api/error-code failed with HTTP Status 500');
    expect(errorMsg).toContain('Could not extract path "$.data.user.name"');
    expect(errorMsg).toContain('{"error":"Internal Server Error","context":"Database timeout"}'); // Should include matched body
  });
