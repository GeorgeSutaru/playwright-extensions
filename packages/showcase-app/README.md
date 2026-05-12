# @playwright-extensions/showcase-app

This is a demonstration application designed to showcase the capabilities of and usage patterns for the `@playwright-extensions/core` library.

If you are evaluating the extensions or trying to determine how to integrate them effectively into your own automation framework, this app and its tests are the ideal starting point.

## Features Demonstrated

1. **Element Events (`watchElement`)**: Use browser-side mutation observers to track element lifecycle events (`created`, `deleted`, `changed`) without heavy network round trips, fully integrated with Playwright's strict mode and index modifiers (`.first()`, `.last()`, `.nth()`).
2. **Query Response (`queryResponse`)**: Extract structured data (JSON, XML, or via Regex) on the fly directly from the background network streams triggered by browser interactions without relying on front-end rendering.
3. **API Locators**: Create fully dynamic Playwright locators that resolve via variable extraction natively inside intercepted and processed background endpoints. 
4. **`LocatorRace` Extension**: Elegantly wait for dynamic, unpredictable UI outcomes without throwing strict-mode errors or writing flaky conditional testing code (`if(locator.isVisible())`).
5. **Extended Auto-Interceptors**: 
   - Automatically intercept and log web service responses/failures (`requests: true`).
   - Automatically intercept and log console output (`console: true`).
   - Automatically intercept and catch runtime unhandled exceptions (`errors: true`).
   - Configured easily via the extended `defineConfig` configuration wrapper.

## Running the Showcase

The application features deliberately randomized operations to emulate a real-world asynchronous application. Start by testing it manually, then run the automation.

1. **Start the application**
   ```bash
   npm start
   ```
   Navigate to `http://localhost:8300` and visually trigger the errors.

2. **Run the Showcase Tests**
   ```bash
   npm run test:showcase
   ```
   The `test:showcase` script triggers Playwright. It will automatically start the UI server locally if it isn't already running.

## Where to Look

- **`playwright.config.ts`**: Shows how to use the extended `defineConfig` wrapper from the core package to inject configurations.
- **`tests/element-event.spec.ts`**: Showcases how to set up buffered `ElementWatcher` objects via `page.watchElement` securely allowing interactions (e.g., clicks, types) before waiting on strict-mode verified `.waitForEvent(...)` mutations. 
- **`tests/query-response.spec.ts`**: Demonstrates robust backend data validation dynamically intercepting JSON/Regex patterns via `page.queryResponse` during component load sequences.
- **`tests/api-locator.spec.ts`**: Example of native locator instantiation resolving dynamically to variable payloads extracted from intercepted network calls.
- **`tests/showcase.spec.ts`**: Shows exactly how to instantiate `LocatorRace.race()` to gracefully handle non-deterministic DOM changes. Includes explicit steps that will be captured in logs by the global active UI interceptors.
- **`public/app.js`**: Contains the intentionally flawed front-end logic that perfectly triggers the console and page-error interceptors, proving they work.