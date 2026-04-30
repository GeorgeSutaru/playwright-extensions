# Playwright Extensions

A collection of useful Playwright extensions for testing and automation.

## Installation

```bash
npm install @playwright-extensions/core
```

## Usage

```typescript
import { LocatorRace } from '@playwright-extensions/core';
```

## Extensions

### `LocatorRace.race()` - Race Multiple Locators

Polls locator visibility in a loop until the first element becomes visible. Enforces strict mode: if multiple locators are visible in the same check, it throws.

#### Basic Usage

```typescript
import { LocatorRace } from '@playwright-extensions/core';

const winner = await LocatorRace.race([
  page.locator('#a'),
  page.locator('#b'),
]);

await winner.click();
```

#### Strict Mode

Throws if multiple locators are visible simultaneously:

```typescript
const winner = await LocatorRace.race([
  page.locator('#first'),
  page.locator('#second'),
]);
// Throws: "Strict mode violation: multiple locators found visible..."
```

#### Options

```typescript
const winner = await LocatorRace.race(
  [page.locator('#a'), page.locator('#b')],
  {
    timeout: 5000,        // Max wait time (default: 0 = no timeout)
    pollInterval: 100,    // Check interval in ms (default: 100)
  }
);
```

### `page.raceLocator()` - Race via Page Fixture

A page fixture extension that delegates to `LocatorRace.race()`. Use the fixture from `@playwright-extensions/core` to get `page.raceLocator()`:

```typescript
import { test, expect } from '@playwright-extensions/core';

test('race locators', async ({ page }) => {
  const winner = await page.raceLocator([
    page.locator('#a'),
    page.locator('#b'),
  ]);
  await winner.click();
});
```

Options work the same way:

```typescript
const winner = await page.raceLocator(
  [page.locator('#a'), page.locator('#b')],
  { timeout: 5000, pollInterval: 100 }
);
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
