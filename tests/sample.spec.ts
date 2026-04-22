import { test, expect } from '@playwright/test';

test('sample extension test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});
