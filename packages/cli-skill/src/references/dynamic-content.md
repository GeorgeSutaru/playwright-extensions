# Dynamic Content with Race Locator

Handle pages where content appears, disappears, or changes over time.

## Loading States

Race between loading indicators and content:

```typescript
// Wait for content to replace loading spinner
const winner = await LocatorRace.race([
  page.locator('.loading-spinner'),
  page.locator('.content-loaded'),
], { timeout: 10000 });

// If spinner is still visible after timeout, content didn't load
if (await winner.locator('.loading-spinner').isVisible().catch(() => false)) {
  throw new Error('Content failed to load');
}
```

### Lazy Content

```typescript
// Race between skeleton loader and actual content
const winner = await LocatorRace.race([
  page.locator('.skeleton'),
  page.locator('.data-table'),
], { timeout: 5000 });

const isData = await winner.locator('.data-table').isVisible().catch(() => false);
expect(isData).toBe(true);
```

### Deferred Rendering

```typescript
// Content may appear at different times
const winner = await LocatorRace.race([
  page.locator('#quick-render'),
  page.locator('#deferred-render'),
], { timeout: 10000 });

expect(await winner.isVisible()).toBe(true);
```

## Transitions and Animations

### State Transitions

```typescript
// Wait for element to transition between states
const winner = await LocatorRace.race([
  page.locator('.state--loading'),
  page.locator('.state--ready'),
], { timeout: 3000 });

expect(await winner.getAttribute('class')).toContain('ready');
```

### Animated Content

```typescript
// Handle content that fades/slides in
const winner = await LocatorRace.race([
  page.locator('.animation--entering'),
  page.locator('.animation--entered'),
], { timeout: 2000 });

// Wait for animation to complete
await page.waitForTimeout(500);
expect(await winner.isVisible()).toBe(true);
```

## Network-Dependent Content

### API Response Waiting

```typescript
// Race between initial state and API-populated state
await page.click('button[data-action="load-data"]');

const winner = await LocatorRace.race([
  page.locator('.data-empty'),
  page.locator('.data-loaded'),
], { timeout: 10000 });

const isEmpty = await winner.locator('.data-empty').isVisible().catch(() => false);
expect(isEmpty).toBe(false);
```

### Race Conditions

```typescript
// Handle race between concurrent operations
await Promise.all([
  page.click('button[action="sync"]'),
  page.click('button[action="refresh"]'),
]);

const winner = await LocatorRace.race([
  page.getByText('Sync complete'),
  page.getByText('Refresh complete'),
], { timeout: 5000 });

expect(await winner.isVisible()).toBe(true);
```

## Dynamic Lists

### List Updates

```typescript
// Wait for list to update after action
await page.click('button[data-action="add-item"]');

const winner = await LocatorRace.race([
  page.locator('.list--empty'),
  page.locator('.list-item'),
], { timeout: 3000 });

const hasItems = await winner.locator('.list-item').count();
expect(hasItems).toBeGreaterThan(0);
```

### Pagination

```typescript
// Handle dynamic pagination controls
const winner = await LocatorRace.race([
  page.locator('.pagination--next'),
  page.locator('.pagination--last'),
], { timeout: 2000 });

await winner.click();
```

## CLI Examples with pw-ext

```bash
# Race between loading spinner and content
pw-ext race-locator ".loading-spinner" ".content-loaded" --timeout 10000

# Wait for dynamic list items
pw-ext race-locator ".list--empty" ".list-item" --timeout 3000
```

## Best Practices

1. **Set appropriate timeouts** - Long enough for content to load, short enough to fail fast
2. **Use visibility modes** - `presence` mode for elements that exist but aren't visible yet
3. **Check winner after race** - Determine which outcome occurred
4. **Handle loading states** - Race between loading and loaded states explicitly
5. **Avoid polling** - Let race locator handle the waiting, don't use `setInterval`