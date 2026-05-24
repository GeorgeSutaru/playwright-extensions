# Multiple Outcomes with Race Locator

When UI can display multiple possible elements (A/B tests, feature flags, conditional rendering), use `LocatorRace.race()` to handle ambiguity without brittle conditionals.

## The Problem

Standard Playwright tests assume a single target element. When multiple elements could match, tests become flaky:

```typescript
// Fragile: assumes specific element exists
await page.locator('#submit-btn').click();

// Also fragile: requires knowing which variant is shown
if (await page.locator('#variant-a').isVisible()) {
  await page.locator('#variant-a').click();
} else {
  await page.locator('#variant-b').click();
}
```

## The Solution: LocatorRace

```typescript
import { LocatorRace } from '@playwright-extensions/core';

// Returns the locator that is visible - no need to check which variant
const winner = await LocatorRace.race([
  page.locator('#variant-a'),
  page.locator('#variant-b'),
]);
await winner.click();
```

## Patterns

### A/B Test Variants

```typescript
test('checkout with A/B test', async ({ page }) => {
  await page.goto('/checkout');

  const checkoutBtn = await LocatorRace.race([
    page.getByRole('button', { name: 'Pay Now' }),
    page.getByRole('button', { name: 'Proceed to Payment' }),
  ]);

  await checkoutBtn.click();
  await expect(page).toHaveURL(/.*confirmation/);
});
```

### Feature Flags

```typescript
test('new feature flag enabled', async ({ page }) => {
  await page.goto('/dashboard');

  const welcome = await LocatorRace.race([
    page.getByRole('heading', { name: 'New Dashboard' }),
    page.getByRole('heading', { name: 'Dashboard' }),
  ]);

  expect(await welcome.textContent()).toBeTruthy();
});
```

### Conditional UI States

```typescript
test('login with optional 2FA', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name=email]', 'user@example.com');
  await page.fill('input[name=password]', 'secret');
  await page.click('button[type=submit]');

  const winner = await LocatorRace.race([
    page.getByRole('heading', { name: 'Verify Code' }),
    page.getByRole('heading', { name: 'Dashboard' }),
  ], { timeout: 5000 });

  const text = await winner.textContent();
  if (text.includes('Verify')) {
    await page.fill('input[name=code]', '123456');
    await page.click('button[type=submit]');
  }
});
```

### Multiple Possible Success States

```typescript
test('form submission with multiple outcomes', async ({ page }) => {
  await page.goto('/submit');
  await page.fill('input[name=name]', 'Test User');
  await page.click('button[type=submit]');

  const winner = await LocatorRace.race([
    page.getByText('Successfully submitted'),
    page.getByText('Already submitted'),
    page.getByText('Validation error'),
  ], { timeout: 5000 });

  const text = await winner.textContent();
  expect(['Successfully submitted', 'Already submitted']).toContain(text);
});
```

### Dynamic Component Variants

```typescript
test('dynamic component renders one of several variants', async ({ page }) => {
  await page.goto('/widget');

  const widget = await LocatorRace.race([
    page.locator('.widget--chart'),
    page.locator('.widget--table'),
    page.locator('.widget--text'),
  ], { timeout: 3000 });

  expect(await widget.isVisible()).toBe(true);
});
```

## Best Practices

1. **Order matters for clarity** - List most likely outcomes first
2. **Use timeouts** - Always set `timeout` for dynamic content
3. **Check results** - After racing, inspect the winner to determine next steps
4. **Avoid too many options** - Keep race sets small (2-4 locators max)
5. **Use semantic locators** - Prefer `getByRole` over CSS selectors for resilience
