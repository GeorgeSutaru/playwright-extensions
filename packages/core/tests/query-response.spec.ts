import { test, expect } from './../src/extended-test';

test('queryResponse strictness and chaining', async ({ page }) => {
  await page.route('http://example.com/api/test', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: ['a', 'b', 'c'] } }),
    });
  });

  await page.setContent(`
    <script>
      fetch('http://example.com/api/test').then(r => r.json()).then(d => {
        document.body.textContent = JSON.stringify(d);
      });
    </script>
  `);

  await page.waitForSelector('body:not(:empty)', { state: 'visible' });

  const result = await page.queryResponse('http://example.com/api/test', '$.data.items[*]', 'json').first();
  expect(result).toBe('a');
});
