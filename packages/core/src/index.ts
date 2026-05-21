/**
 * Playwright Extensions
 *
 * A collection of useful Playwright extensions for testing and automation.
 */

export * from './extensions';
export * from './config';
export * from './extended-test';

// Sync wrapper — re-exported at top level so it's part of the core API
export {
  launchSyncBrowser,
  connectSyncBrowser,
  getWorker,
  SyncWorker,
  createSyncProxy,
  SyncProxy,
} from './sync';

export type {
  SyncBrowser,
  SyncBrowserContext,
  SyncPage,
  SyncLocator,
  SyncFrame,
  SyncFrameLocator,
  SyncResponse,
  SyncKeyboard,
  SyncMouse,
  SyncTouchscreen,
  SyncAccessibility,
  SyncCoverage,
  SyncTracer,
  LaunchOptions,
  BrowserContextOptions,
} from './sync';
