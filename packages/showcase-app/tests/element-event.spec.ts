import { test, expect } from '@playwright-extensions/core';

test.describe('Showcase Application - Element Change Events', () => {

  test.use({ watchElements: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('records created, changed, and deleted element events in the DOM', async ({ page }) => {
    const listLocator = page.locator('#item-list li');
    
    // Start tracking the locator in the background
    const watcher = await page.watchElement('my-list-items', listLocator);

    // 1. Created Event
    await page.click('#add-item-btn');
    const createdData = await watcher.waitForEvent('created').last(); // Use .last() to ignore strict failure since there are multiple <li> items
    expect(createdData.type).toBe('created');
    expect(createdData.name).toBe('my-list-items');

    // 2. Changed Event
    await page.click('#modify-item-btn');
    const changedData = await watcher.waitForEvent('changed').first(); // Use .first() to ignore strict mode and get the first li modification
    expect(changedData.type).toBe('changed');
    expect(changedData.changes).toBeDefined();
    expect(changedData.changes![0].type).toBe('childList'); // Using textContent implies a childList change natively in modern JS

    // 3. Deleted Event
    await page.click('#delete-item-btn');
    const deletedData = await watcher.waitForEvent('deleted').last(); // Wait for the last element deleted
    expect(deletedData.type).toBe('deleted');

    watcher.unwatch();
  });

  test('throws immediate error if waiting for changed/deleted on non-existent elements', async ({ page }) => {
    const nonexistentLocator = page.locator('#does-not-exist');
    const watcher = await page.watchElement('non-existent', nonexistentLocator);

    await expect(watcher.waitForEvent('changed')).rejects.toThrow("Cannot wait for 'changed' event: no elements currently match the locator.");
    await expect(watcher.waitForEvent('deleted')).rejects.toThrow("Cannot wait for 'deleted' event: no elements currently match the locator.");
  });

  test('enforces strict mode when multiple elements match the locator without an index', async ({ page }) => {
    // Add multiple items first to trigger strict mode
    await page.click('#add-item-btn');
    await page.click('#add-item-btn');
    
    const listLocator = page.locator('#item-list li');
    const watcher = await page.watchElement('many-items', listLocator);
    
    // There are now multiple items in the DOM, so this should strictly fail
    await expect(watcher.waitForEvent('changed')).rejects.toThrow("Strict mode violation: multiple elements match the locator.");
    
    // It succeeds immediately when bypassed via nth
    await page.click('#modify-item-btn'); // Modifies the last item natively in our app.js
    const data = await watcher.waitForEvent('changed').last();
    expect(data.type).toBe('changed');
  });

});

test.describe('Showcase Application - Element Change Events Disabled', () => {
  // Explicitly disable for this test block
  test.use({ watchElements: false });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('throws an error if feature is used without being enabled', async ({ page }) => {
    try {
        await page.watchElement('dummy', page.locator('body'));
        throw new Error('Should have thrown an error due to disabled config');
    } catch (e: any) {
        expect(e.message).not.toContain('Should have thrown an error');
        expect(e.message).toContain('watchElement is disabled');
    }
  });

});