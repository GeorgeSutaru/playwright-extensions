---
name: playwright-race
description: Extends playwright-cli with race locator patterns for handling multiple UI outcomes, error handling, and dynamic content. Use when the user needs to handle ambiguous UI elements, multiple possible targets, or conditional content.
allowed-tools: Bash(playwright-cli:*)
---

# Browser Automation with playwright-cli + Race Locator

## Quick start

```bash
# open new browser
playwright-cli open
# navigate to a page
playwright-cli goto https://playwright.dev
# interact with the page using refs from the snapshot
playwright-cli click e15
# close the browser
playwright-cli close
```

## Race Locator for Multiple UI Outcomes

When a page can display multiple possible elements (A/B tests, conditional UI, feature flags), use `raceLocator` to handle ambiguity.

### Via pw-ext (recommended)

```bash
# Handle A/B test variants
pw-ext race-locator "#variant-a" "#variant-b"

# Handle feature flag scenarios
pw-ext race-locator "button:has-text(New Checkout)" "button:has-text(Classic Checkout)"

# With timeout for dynamic content
pw-ext race-locator "button:has-text(Pay)" "button:has-text(Checkout)" --timeout 5000

# With presence mode for hidden elements
pw-ext race-locator "#hidden-option" "#visible-option" --visibility presence
```

### Via run-code (playwright-cli)

```bash
# Handle A/B test variants
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  const winner = await LocatorRace.race([
    page.locator('#variant-a'),
    page.locator('#variant-b'),
  ]);
  await winner.click();
  return 'clicked winner';
}"

# Handle feature flag scenarios
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  const winner = await LocatorRace.race([
    page.getByRole('button', { name: 'New Checkout' }),
    page.getByRole('button', { name: 'Classic Checkout' }),
  ]);
  await winner.click();
  return 'clicked checkout';
}"
```

### In test files

```typescript
import { LocatorRace } from '@playwright-extensions/core';

// Handle multiple possible outcomes
const winner = await LocatorRace.race([
  page.locator('#confirm'),
  page.locator('#submit'),
]);
await winner.click();

// With timeout for dynamic content
const winner = await LocatorRace.race([
  page.locator('#loading-spinner'),
  page.locator('#content'),
], { timeout: 5000 });
```

### Visibility modes

```typescript
// Default: element must be visible (not display:none, not in viewport)
await LocatorRace.race([page.locator('#a'), page.locator('#b')], {
  visibilityMode: 'default',
});

// Visible: element must be rendered (visible in DOM, may be off-screen)
await LocatorRace.race([page.locator('#a'), page.locator('#b')], {
  visibilityMode: 'visible',
});

// Presence: element must exist in DOM (regardless of visibility)
await LocatorRace.race([page.locator('#a'), page.locator('#b')], {
  visibilityMode: 'presence',
});
```

## pw-ext CLI

The `pw-ext` command provides a direct way to race locators from the terminal:

```bash
# Basic race - returns text of the visible element
pw-ext race-locator "#variant-a" "#variant-b"

# With timeout
pw-ext race-locator "button:has-text(Pay)" "button:has-text(Checkout)" --timeout 5000

# With visibility mode
pw-ext race-locator "#hidden" "#visible" --visibility presence

# With session name
pw-ext race-locator "#a" "#b" -s mysession

# Pass-through to playwright-cli for all other commands
pw-ext open https://example.com
pw-ext goto https://example.com
pw-ext click e15
pw-ext snapshot
pw-ext close
```

## Commands

### Core

```bash
playwright-cli open
playwright-cli goto https://example.com
playwright-cli type "search query"
playwright-cli click e3
playwright-cli dblclick e7
playwright-cli fill e5 "user@example.com"
playwright-cli drag e2 e8
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli upload ./document.pdf
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli snapshot
playwright-cli snapshot --filename=after-click.yaml
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
playwright-cli dialog-accept
playwright-cli dialog-accept "confirmation text"
playwright-cli dialog-dismiss
playwright-cli resize 1920 1080
playwright-cli close
```

### Navigation

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### Keyboard

```bash
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli keydown Shift
playwright-cli keyup Shift
```

### Mouse

```bash
playwright-cli mousemove 150 300
playwright-cli mousedown
playwright-cli mousedown right
playwright-cli mouseup
playwright-cli mouseup right
playwright-cli mousewheel 0 100
```

### Save as

```bash
playwright-cli screenshot
playwright-cli screenshot e5
playwright-cli screenshot --filename=page.png
playwright-cli pdf --filename=page.pdf
```

### Tabs

```bash
playwright-cli tab-list
playwright-cli tab-new
playwright-cli tab-new https://example.com/page
playwright-cli tab-close
playwright-cli tab-close 2
playwright-cli tab-select 0
```

### Storage

```bash
playwright-cli state-save
playwright-cli state-save auth.json
playwright-cli state-load auth.json

# Cookies
playwright-cli cookie-list
playwright-cli cookie-list --domain=example.com
playwright-cli cookie-get session_id
playwright-cli cookie-set session_id abc123
playwright-cli cookie-set session_id abc123 --domain=example.com --httpOnly --secure
playwright-cli cookie-delete session_id
playwright-cli cookie-clear

# LocalStorage
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark
playwright-cli localstorage-delete theme
playwright-cli localstorage-clear

# SessionStorage
playwright-cli sessionstorage-list
playwright-cli sessionstorage-get step
playwright-cli sessionstorage-set step 3
playwright-cli sessionstorage-delete step
playwright-cli sessionstorage-clear
```

### Network

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
playwright-cli route-list
playwright-cli unroute "**/*.jpg"
playwright-cli unroute
```

### DevTools

```bash
playwright-cli console
playwright-cli console warning
playwright-cli network
playwright-cli run-code "async page => await page.context().grantPermissions(['geolocation'])"
playwright-cli tracing-start
playwright-cli tracing-stop
playwright-cli video-start
playwright-cli video-stop video.webm
```

## Open parameters

```bash
# Use specific browser when creating session
playwright-cli open --browser=chrome
playwright-cli open --browser=firefox
playwright-cli open --browser=webkit
playwright-cli open --browser=msedge
# Connect to browser via extension
playwright-cli open --extension

# Use persistent profile (by default profile is in-memory)
playwright-cli open --persistent
# Use persistent profile with custom directory
playwright-cli open --profile=/path/to/profile

# Start with config file
playwright-cli open --config=my-config.json

# Close the browser
playwright-cli close
# Delete user data for the default session
playwright-cli delete-data
```

## Snapshots

After each command, playwright-cli provides a snapshot of the current browser state.

```bash
> playwright-cli goto https://example.com
### Page
- Page URL: https://example.com/
- Page Title: Example Domain
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

You can also take a snapshot on demand using `playwright-cli snapshot` command.

If `--filename` is not provided, a new snapshot file is created with a timestamp. Default to automatic file naming, use `--filename=` when artifact is a part of the workflow result.

## Browser Sessions

```bash
# create new browser session named "mysession" with persistent profile
playwright-cli -s=mysession open example.com --persistent
# same with manually specified profile directory (use when requested explicitly)
playwright-cli -s=mysession open example.com --profile=/path/to/profile
playwright-cli -s=mysession click e6
playwright-cli -s=mysession close  # stop a named browser
playwright-cli -s=mysession delete-data  # delete user data for persistent session

playwright-cli list
# Close all browsers
playwright-cli close-all
# Forcefully kill all browser processes
playwright-cli kill-all
```

## Local installation

In some cases user might want to install playwright-cli locally. If running globally available `playwright-cli` binary fails, use `npx playwright-cli` to run the commands. For example:

```bash
npx playwright-cli open https://example.com
npx playwright-cli click e1
```

## Example: Form submission

```bash
playwright-cli open https://example.com/form
playwright-cli snapshot

playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "password123"
playwright-cli click e3
playwright-cli snapshot
playwright-cli close
```

## Example: Multi-tab workflow

```bash
playwright-cli open https://example.com
playwright-cli tab-new https://example.com/other
playwright-cli tab-list
playwright-cli tab-select 0
playwright-cli snapshot
playwright-cli close
```

## Example: Debugging with DevTools

```bash
playwright-cli open https://example.com
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli console
playwright-cli network
playwright-cli close
```

```bash
playwright-cli open https://example.com
playwright-cli tracing-start
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli tracing-stop
playwright-cli close
```

## Race Locator Patterns

### Handling multiple possible outcomes

When a page may show different elements depending on state, use `raceLocator` to handle ambiguity:

```bash
# Handle login success/failure states
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  const winner = await LocatorRace.race([
    page.getByRole('heading', { name: 'Welcome' }),
    page.getByRole('heading', { name: 'Error' }),
  ], { timeout: 5000 });
  const text = await winner.textContent();
  if (text.includes('Welcome')) {
    return 'login-success';
  }
  return 'login-failed';
}"
```

See [references/multiple-outcomes.md](references/multiple-outcomes.md) for more patterns.

### Error handling with race locator

```bash
# Handle optional elements gracefully
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  try {
    const winner = await LocatorRace.race([
      page.getByRole('button', { name: 'Continue' }),
      page.getByRole('button', { name: 'Next' }),
    ], { timeout: 3000 });
    await winner.click();
    return 'clicked';
  } catch (e) {
    return 'no-continue-button';
  }
}"
```

See [references/error-handling.md](references/error-handling.md) for more patterns.

### Dynamic content and loading states

```bash
# Wait for dynamic content to appear
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  const winner = await LocatorRace.race([
    page.locator('.loading-spinner'),
    page.locator('.content-loaded'),
  ], { timeout: 10000 });
  const isLoaded = await winner.locator('.content-loaded').isVisible().catch(() => false);
  return isLoaded ? 'loaded' : 'timeout';
}"
```

See [references/dynamic-content.md](references/dynamic-content.md) for more patterns.

### Visibility modes for different scenarios

```bash
# Use presence mode for elements that may be hidden
playwright-cli run-code "async page => {
  const { LocatorRace } = require('@playwright-extensions/core');
  const winner = await LocatorRace.race([
    page.locator('#hidden-option'),
    page.locator('#visible-option'),
  ], { visibilityMode: 'presence' });
  return winner.toString();
}"
```

See [references/visibility-modes.md](references/visibility-modes.md) for more patterns.

## Specific tasks

* **Request mocking** [references/request-mocking.md](references/request-mocking.md)
* **Running Playwright code** [references/running-code.md](references/running-code.md)
* **Browser session management** [references/session-management.md](references/session-management.md)
* **Storage state (cookies, localStorage)** [references/storage-state.md](references/storage-state.md)
* **Test generation** [references/test-generation.md](references/test-generation.md)
* **Tracing** [references/tracing.md](references/tracing.md)
* **Video recording** [references/video-recording.md](references/video-recording.md)
* **Multiple outcomes** [references/multiple-outcomes.md](references/multiple-outcomes.md)
* **Error handling** [references/error-handling.md](references/error-handling.md)
* **Dynamic content** [references/dynamic-content.md](references/dynamic-content.md)
* **Visibility modes** [references/visibility-modes.md](references/visibility-modes.md)