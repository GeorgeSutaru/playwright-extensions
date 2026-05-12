import { test, expect } from '@playwright-extensions/core';

test.describe('Showcase Application - queryResponse', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('extracts single value from intercepted json response', async ({ page }) => {
    await page.click('#fetch-user-btn');
    await expect(page.locator('#user-message')).toBeVisible();
    
    // queryResponse returns a promise that revolves to the extracted payload value
    const val = await page.queryResponse('/api/user', '$.data.user.name', 'json');
    expect(val).toBe('Alice');
  });

  test('extracts single value from intercepted xml response', async ({ page }) => {
    await page.click('#fetch-product-btn');
    await expect(page.locator('#product-message')).toBeVisible();
    
    const val = await page.queryResponse('/api/product', '$.Catalog.Product.Name', 'xml');
    expect(val).toBe('Widget X');
  });

  test('extracts single value from intercepted regex response', async ({ page }) => {
    await page.click('#fetch-status-btn');
    await expect(page.locator('#status-message')).toBeVisible();
    
    // Matches the word "ACTIVE"
    const val = await page.queryResponse('/api/status', 'Server Status: (\\w+)', 'regex');
    expect(val).toBe('ACTIVE');
  });

  test('throws error when multiple responses match but index is not specified', async ({ page }) => {
    await page.click('#fetch-user-btn');
    await expect(page.locator('#user-message')).toBeVisible();
    
    // Fire it again so we have multiple responses in the history
    await page.click('#fetch-user-btn');
    await page.waitForTimeout(1500); // give it time to resolve
    
    try {
        await page.queryResponse('/api/user', '$.data.user.name', 'json');
        expect.fail('Should have thrown an error');
    } catch (e: any) {
        expect(e.message).not.toBe('Should have thrown an error');
        expect(e.message).toContain('queryResponse strict mode violation: Multiple results found');
    }
  });

  test('handles multiple responses natively using first, last, and nth', async ({ page }) => {
    await page.click('#fetch-user-btn');
    await expect(page.locator('#user-message')).toBeVisible();
    
    // Fire it again
    await page.click('#fetch-user-btn');
    await page.waitForTimeout(1500);

    // .first() goes to index 0, .last() goes to -1
    const firstVal = await page.queryResponse('/api/user', '$.data.user.name', 'json').first();
    expect(firstVal).toBe('Alice');

    const lastVal = await page.queryResponse('/api/user', '$.data.user.name', 'json').last();
    expect(lastVal).toBe('Alice');
    
    const indexVal = await page.queryResponse('/api/user', '$.data.user.name', 'json').nth(1);
    expect(indexVal).toBe('Alice');
  });
  
  test('handles different endpoints matching the same url filter (regex)', async ({ page }) => {
    await page.route('**/api/filter-test/*', async route => {
        const url = route.request().url();
        await route.fulfill({ json: { value: url.endsWith('1') ? 'E1' : 'E2' } });
    });

    // Fetch them strictly in order
    await page.evaluate(async () => {
        await fetch('/api/filter-test/1');
    });
    await page.evaluate(async () => {
        await fetch('/api/filter-test/2');
    });
    
    // Allow the background network logger (page.on('response')) a brief moment to push them
    await page.waitForTimeout(200);

    // Both requests match /api\/filter-test/
    const firstMatch = await page.queryResponse(/api\/filter-test\//, '$.value', 'json').first();
    const secondMatch = await page.queryResponse(/api\/filter-test\//, '$.value', 'json').nth(1);

    expect(firstMatch).toBe('E1');
    expect(secondMatch).toBe('E2');
  });

  test('handles multiple results extracted from the same response array natively', async ({ page }) => {
    await page.route('**/api/users', async route => {
        await route.fulfill({ json: { users: [{ id: 10 }, { id: 20 }, { id: 30 }] } });
    });

    await page.evaluate(async () => {
        await fetch('/api/users');
    });
    
    await page.waitForTimeout(200);

    // $.users[*].id yields [10, 20, 30] 
    const val1 = await page.queryResponse('/api/users', '$.users[*].id', 'json').first();
    const val2 = await page.queryResponse('/api/users', '$.users[*].id', 'json').nth(1);
    const val3 = await page.queryResponse('/api/users', '$.users[*].id', 'json').last();

    expect(val1).toBe(10);
    expect(val2).toBe(20);
    expect(val3).toBe(30);

    // Strict mode throws if you don't scope index!
    try {
        await page.queryResponse('/api/users', '$.users[*].id', 'json');
        throw new Error('Should have thrown an error');
    } catch (e: any) {
        expect(e.message).not.toBe('Should have thrown an error');
        expect(e.message).toContain('queryResponse strict mode violation: Multiple results found');
        expect(e.message).toContain('Total results extracted: 3');
    }
  });

  test('queries resolve instantly for payloads that were already received and stored', async ({ page }) => {
    await page.route('**/api/immediate', async route => {
        await route.fulfill({ json: { status: 'instant' } });
    });

    // 1. Issue request
    await page.evaluate(async () => {
        await fetch('/api/immediate');
    });
    
    // 2. Add an artificial delay ensuring the payload is heavily cached in history
    await page.waitForTimeout(500);

    // 3. Fire query
    const start = Date.now();
    const val = await page.queryResponse('/api/immediate', '$.status', 'json');
    const elapsed = Date.now() - start;

    expect(val).toBe('instant');
    expect(elapsed).toBeLessThan(100);
  });

});
