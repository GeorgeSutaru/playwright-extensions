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

### Element Events
Track `created`, `changed`, and `deleted` events for specific element locators efficiently using a native browser-side `MutationObserver` mapped securely via internal Playwright engine references.

This avoids performance heavy network round-trips for multiple status checks, and safely tracks old and new string changes directly in a buffered array.

*Warning: You must enable this via your test configuration explicitly setting `watchElements: true`.*

```typescript
import { test, expect } from '@playwright-extensions/core';

// Enable the Watcher Plugin
test.use({ watchElements: true });

test('element change tracking', async ({ page }) => {
  const listLocator = page.locator('#item-list li');
  
  // 1. Hook the watcher in the background
  const watcher = await page.watchElement('my-list-items', listLocator);

  // 2. Take UI Actions securely without racing the framework
  await page.click('#modify-item-btn'); 

  // 3. Resolve exact element interactions using `.first()`, `.last()`, or `.nth()`
  // Note: Unindexed calls natively enforce strict mode!
  const changedData = await watcher.waitForEvent('changed').first();
  
  expect(changedData.type).toBe('changed');
  console.log(changedData.changes[0].oldValue); // "New Item"
  
  watcher.unwatch();
});
```

### Query Response & API Locators
Extract variable data natively from the hidden backbone network requests triggered by page loads, without waiting on standard heavy UI integrations. Supports parsing architectures out of the box via `json`, `xml`, or `regex` mechanisms.

```typescript
import { test, expect } from '@playwright-extensions/core';

test('verify data in network and ui', async ({ page }) => {
  // Query JSONPath from any intercepted background fetch
  const name = await page.queryResponse(
    /api\/user/, 
    '$.data.user.name', 
    'json'
  ).first();

  // Create standard Playwright locators that resolve dynamically 
  // via payload extractions matching a Regex pattern over an endpoint!
  const productLabel = page.locator(
    /\/api\/product/, 
    '<Name>(.*)</Name>', 
    'regex'
  );

  await expect(productLabel).toBeVisible();
});
```

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

### Sync Wrapper - Synchronous Playwright API

A synchronous wrapper for Playwright that allows calling Playwright methods without `await`, using a worker thread architecture to keep the Node.js event loop free. All void methods return `this` for method chaining.

#### Installation

```bash
npm install @playwright-extensions/core
```

#### Quick Start

```javascript
const { launchSyncBrowser } = require('@playwright-extensions/core');

const browser = launchSyncBrowser('chromium', { headless: true });
const context = browser.newContext();
const page = context.newPage();

page.goto('https://example.com');
console.log(page.title());

browser.close();
```

#### Method Chaining

All void methods return `this`, enabling fluent method chaining:

```javascript
// Fill and read value in one expression
const value = page.locator('#input').fill('hello').inputValue();

// Check a checkbox and verify
const checked = page.locator('#cb').check().isChecked();

// Set content, locate, and read text
const text = page.setContent('<h1>Hello</h1>').locator('h1').textContent();

// Multi-step interaction chain
const result = page.locator('#i').fill('one').clear().fill('two').inputValue();

// Click chain
const count = page.locator('#btn').click().click().textContent();
```

#### API Overview

**Browser**
- `launchSyncBrowser(browserType, options)` - Launch a browser synchronously
- `connectSyncBrowser(endpointURL, options)` - Connect to a CDP endpoint
- `newContext(options)` / `newBrowserContext(options)` - Create a browser context
- `close()` - Close the browser

**Page**
- `goto(url, options)` - Navigate to a URL (returns Response, not chainable)
- `locator(selector)` - Create a locator
- `getByRole(role, options)` - Locate by accessibility role
- `getByText(text, options)` - Locate by text content
- `getByLabel(label, options)` - Locate by label
- `getByPlaceholder(placeholder, options)` - Locate by placeholder
- `getByTestId(testId)` - Locate by test ID
- `click(selector)` / `dblclick(selector)` - Click an element
- `fill(selector, value)` - Fill an input
- `check(selector)` / `uncheck(selector)` - Toggle a checkbox
- `setContent(html)` - Set page HTML content
- `evaluate(pageFunction, arg)` - Evaluate JavaScript in page context
- `screenshot(options)` - Take a screenshot (returns Buffer)
- `content()` - Get page HTML
- `title()` / `url()` - Get page title or URL
- `waitForTimeout(ms)` - Block for specified milliseconds
- `keyboard` / `mouse` / `touchscreen` - Input devices
- `mainFrame()` / `frames()` - Frame access

**Locator**
- `click()` / `dblclick()` - Click the located element
- `fill(value)` / `type(text)` - Fill or type into element
- `check()` / `uncheck()` - Toggle checkbox state
- `clear()` - Clear input value
- `press(key)` - Press a keyboard key
- `hover()` / `focus()` - Hover or focus element
- `textContent()` / `innerText()` / `innerHTML()` - Get text content
- `inputValue()` / `getAttribute(name)` - Get input value or attribute
- `isVisible()` / `isHidden()` / `isChecked()` / `isDisabled()` - State checks
- `count()` - Get number of matching elements
- `first()` / `last()` / `nth(index)` - Index-based selection
- `filter(options)` - Filter by nested content
- `and(locator)` / `or(locator)` - Combine locators
- `locator(selector)` - Nested locator within element scope
- `screenshot(options)` - Element screenshot (returns Buffer)

**Keyboard / Mouse / Touchscreen**
```javascript
page.keyboard.type('Hello');
page.keyboard.press('Enter');
page.mouse.click(x, y);
page.touchscreen.tap(x, y);
```

#### Architecture

The sync wrapper uses a dispatcher thread pattern with `SharedArrayBuffer` for synchronization:

1. **Main thread**: Your test code runs here, making synchronous calls
2. **Worker thread**: Playwright runs in an isolated worker thread
3. **SharedArrayBuffer**: Atomic operations signal request/response completion
4. **Object registry**: Playwright objects are registered with IDs and proxied back to the main thread

This design ensures the Node.js event loop is never blocked, even though your API calls appear synchronous.

#### Accessing the Async API

The underlying Playwright page object is accessible when you need async operations:

```javascript
// Use the sync API for most operations
page.locator('#input').fill('hello');

// Access the raw async page when needed
const worker = getWorker(page);
// worker.sendSync() for custom operations
```

#### Limitations

- Navigation methods (`goto`, `reload`, `goBack`, `goForward`) return Response objects, not `this` - use separate statements
- `locator()` chaining searches within the element's scope, not the page
- Functions passed as arguments (e.g., `evaluate`, `$eval`) are serialized as source strings
- Circular references in results are protected with `WeakSet` tracking
- Playwright 1.59.1: `locator.boxModel()` use `boundingBox()` instead; `page.accessibility` use `ariaSnapshot()` instead

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
