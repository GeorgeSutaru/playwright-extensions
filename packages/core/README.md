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

### `page.raceLocator()` - Race Multiple Locators via Page Fixture

A page fixture extension that polls locator visibility in a loop until the first element becomes visible. Enforces strict mode: if multiple locators are visible in the same check, it throws.

#### Prerequisites

Locators must be extended with a `getSelector()` method:

```typescript
import { RaceLocatorObject } from '@playwright-extensions/core';

function makeRaceLocator(loc: any, selector: string): RaceLocatorObject {
  return Object.assign(loc, { getSelector: () => selector });
}
```

#### Basic Usage

```typescript
import { test, expect } from '@playwright-extensions/core';

test('race locators', async ({ page }) => {
  const locA = makeRaceLocator(page.locator('#a'), '#a');
  const locB = makeRaceLocator(page.locator('#b'), '#b');

  // Returns the first visible locator
  const winner = await page.raceLocator([locA, locB]);
  await winner.click();
});
```

#### Strict Mode

Throws if multiple locators are visible simultaneously:

```typescript
const loc1 = makeRaceLocator(page.locator('#first'), '#first');
const loc2 = makeRaceLocator(page.locator('#second'), '#second');

// Throws: "Strict mode violation: multiple locators found visible..."
const winner = await page.raceLocator([loc1, loc2]);
```

#### Options

```typescript
const winner = await page.raceLocator([locA, locB], {
  timeout: 5000,        // Max wait time (default: 0 = no timeout)
  pollInterval: 100,    // Check interval in ms (default: 100)
});
```

#### Using Locally (without fixture)

You can also use `LocatorRace.race()` directly:

```typescript
import { LocatorRace } from '@playwright-extensions/core';

const winner = await LocatorRace.race([locA, locB]);
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
