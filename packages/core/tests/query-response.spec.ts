import { test, expect } from './../src/extended-test';

test('queryResponse strictness and chaining', async ({ page }) => {
    let result = await page.queryResponse('url', 'path', 'json').first();
});
