import { SyncWorker, createSyncProxy, SyncProxy } from './sync-proxy';

export interface LaunchOptions {
  headless?: boolean;
  executablePath?: string;
  args?: string[];
  ignoreDefaultArgs?: boolean | string[];
  timeout?: number;
  env?: Record<string, string>;
  devtools?: boolean;
  slowMo?: number;
}

export interface BrowserContextOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  baseURL?: string;
  extraHTTPHeaders?: Record<string, string>;
  storageState?: string | { cookies: unknown[]; origins: unknown[] };
}

export interface SyncBrowser extends SyncProxy {
  newContext(options?: BrowserContextOptions): SyncBrowserContext;
  newBrowserContext(options?: BrowserContextOptions): SyncBrowserContext;
  pages(): SyncBrowserContext[];
  close(): this;
  isConnected(): boolean;
}

export interface SyncBrowserContext extends SyncProxy {
  newPage(): SyncPage;
  pages(): SyncPage[];
  close(): this;
  cookies(url?: string): unknown[];
  addCookies(cookies: unknown[]): this;
  grantPermissions(permissions: string[], options?: { origin?: string }): this;
  storageState(options?: { path?: string }): unknown;
  tracer?: SyncTracer;
}

export interface SyncPage extends SyncProxy {
  goto(url: string, options?: { timeout?: number; waitUntil?: string }): SyncResponse | null;
  locator(selector: string, options?: { hasText?: string | unknown; has?: unknown }): SyncLocator;
  getByRole(role: string, options?: Record<string, unknown>): SyncLocator;
  getByText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByLabel(label: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByPlaceholder(placeholder: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByTestId(testId: string): SyncLocator;
  getByAltText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByTitle(title: string | unknown, options?: { exact?: boolean }): SyncLocator;
  click(selector: string, options?: Record<string, unknown>): this;
  dblclick(selector: string, options?: Record<string, unknown>): this;
  check(selector: string, options?: Record<string, unknown>): this;
  uncheck(selector: string, options?: Record<string, unknown>): this;
  fill(selector: string, value: string, options?: Record<string, unknown>): this;
  type(selector: string, text: string, options?: Record<string, unknown>): this;
  press(selector: string, key: string, options?: Record<string, unknown>): this;
  selectOption(selector: string, values: string | unknown | unknown[], options?: Record<string, unknown>): string[];
  evaluate(pageFunction: string | Function, arg?: unknown): unknown;
  evaluateHandle(pageFunction: string | Function, arg?: unknown): unknown;
  content(): string;
  setContent(html: string, options?: { timeout?: number; waitUntil?: string }): this;
  url(): string;
  title(): string;
  screenshot(options?: { type?: string; path?: string; fullPage?: boolean; clip?: Record<string, number> }): Buffer;
  waitForSelector(selector: string, options?: { state?: string; timeout?: number }): SyncLocator | null;
  waitForURL(url: string | RegExp, options?: { timeout?: number; waitUntil?: string }): this;
  waitForLoadState(state?: string, options?: { timeout?: number }): this;
  waitForTimeout(timeout: number): this;
  waitForResponse(urlOrPredicate: string | RegExp, options?: { timeout?: number }): SyncResponse;
  waitForRequest(urlOrPredicate: string | RegExp, options?: { timeout?: number }): unknown;
  $ (selector: string): SyncLocator | null;
  $$ (selector: string): SyncLocator[];
  $eval<R>(selector: string, pageFunction: string | Function, arg?: unknown): R;
  $$eval<R>(selector: string, pageFunction: string | Function, arg?: unknown): R;
  goBack(options?: { timeout?: number; waitUntil?: string }): SyncResponse | null;
  goForward(options?: { timeout?: number; waitUntil?: string }): SyncResponse | null;
  reload(options?: { timeout?: number; waitUntil?: string }): SyncResponse | null;
  setDefaultTimeout(timeout: number): this;
  setExtraHTTPHeaders(headers: Record<string, string>): this;
  emulateMedia(options?: { colorScheme?: string; reducedMotion?: string; media?: string }): this;
  bringToFront(): this;
  close(options?: { runBeforeUnload?: boolean }): this;
  isClosed(): boolean;
  mainFrame(): SyncFrame;
  frames(): SyncFrame[];
  frame(options?: { name?: string; url?: string | RegExp }): SyncFrame | null;
  frameLocator(selector: string): SyncFrameLocator;
  addScriptTag(options?: { url?: string; path?: string; content?: string }): unknown;
  addStyleTag(options?: { url?: string; path?: string }): unknown;
  addInitScript(script: string | Function, arg?: unknown): this;
  exposeFunction(name: string, callback: Function): this;
  route(url: string | RegExp, handler: Function): this;
  unroute(url: string | RegExp, handler?: Function): this;
  keyboard: SyncKeyboard;
  mouse: SyncMouse;
  touchscreen: SyncTouchscreen;
  accessibility: SyncAccessibility;
  coverage: SyncCoverage;
  context(): SyncBrowserContext;
  opener(): SyncPage | null;
  viewportSize(): { width: number; height: number } | null;
  setViewportSize(size: { width: number; height: number }): this;
  dispatchEvent(selector: string, type: string, eventInit?: Record<string, unknown>): this;
  dragAndDrop(source: string, target: string, options?: Record<string, unknown>): this;
  getAttribute(selector: string, name: string, options?: Record<string, unknown>): string | null;
  isChecked(selector: string, options?: Record<string, unknown>): boolean;
  isDisabled(selector: string, options?: Record<string, unknown>): boolean;
  isEnabled(selector: string, options?: Record<string, unknown>): boolean;
  isEditable(selector: string, options?: Record<string, unknown>): boolean;
  isHidden(selector: string, options?: Record<string, unknown>): boolean;
  isVisible(selector: string, options?: Record<string, unknown>): boolean;
  inputValue(selector: string, options?: Record<string, unknown>): string;
  innerText(selector: string, options?: Record<string, unknown>): string;
  innerHTML(selector: string, options?: Record<string, unknown>): string;
  focus(selector: string, options?: Record<string, unknown>): this;
  hover(selector: string, options?: Record<string, unknown>): this;
  tap(selector: string, options?: Record<string, unknown>): this;
  clearConsoleMessages(): this;
  clearPageErrors(): this;
  consoleMessages(): unknown[];
  waitForFunction(pageFunction: string | Function, arg?: unknown, options?: { timeout?: number }): unknown;
}

export interface SyncLocator extends SyncProxy {
  click(options?: Record<string, unknown>): this;
  dblclick(options?: Record<string, unknown>): this;
  check(options?: Record<string, unknown>): this;
  uncheck(options?: Record<string, unknown>): this;
  fill(value: string, options?: Record<string, unknown>): this;
  type(text: string, options?: Record<string, unknown>): this;
  press(key: string, options?: Record<string, unknown>): this;
  selectOption(values: string | unknown | unknown[], options?: Record<string, unknown>): string[];
  clear(options?: Record<string, unknown>): this;
  focus(options?: Record<string, unknown>): this;
  hover(options?: Record<string, unknown>): this;
  tap(options?: Record<string, unknown>): this;
  textContent(options?: { timeout?: number }): string | null;
  innerText(options?: { timeout?: number }): string | null;
  innerHTML(options?: { timeout?: number }): string | null;
  inputValue(options?: { timeout?: number }): string;
  getAttribute(name: string, options?: { timeout?: number }): string | null;
  isChecked(options?: { timeout?: number }): boolean;
  isDisabled(options?: { timeout?: number }): boolean;
  isEditable(options?: { timeout?: number }): boolean;
  isEnabled(options?: { timeout?: number }): boolean;
  isHidden(options?: { timeout?: number }): boolean;
  isVisible(options?: { timeout?: number }): boolean;
  count(): number;
  first(): SyncLocator;
  last(): SyncLocator;
  nth(index: number): SyncLocator;
  filter(options?: { hasText?: string | unknown; has?: unknown }): SyncLocator;
  and(locator: SyncLocator): SyncLocator;
  or(locator: SyncLocator): SyncLocator;
  locator(selector: string, options?: Record<string, unknown>): SyncLocator;
  getByRole(role: string, options?: Record<string, unknown>): SyncLocator;
  getByText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByLabel(label: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByPlaceholder(placeholder: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByTestId(testId: string): SyncLocator;
  getByAltText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
  getByTitle(title: string | unknown, options?: { exact?: boolean }): SyncLocator;
  screenshot(options?: { timeout?: number; type?: string; path?: string }): Buffer;
  waitFor(options?: { state?: string; timeout?: number }): this;
  elementHandle(options?: { timeout?: number }): unknown;
  elementHandles(): unknown[];
  boxModel(options?: { timeout?: number }): Record<string, unknown>;
}

export interface SyncFrame extends SyncProxy {
  locator(selector: string, options?: Record<string, unknown>): SyncLocator;
  getByRole(role: string, options?: Record<string, unknown>): SyncLocator;
  getByText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
  evaluate(pageFunction: string | Function, arg?: unknown): unknown;
  content(): string;
  name(): string;
  url(): string;
  childFrames(): SyncFrame[];
  parentFrame(): SyncFrame | null;
  isDetached(): boolean;
  waitForLoadState(state?: string, options?: { timeout?: number }): this;
  waitForSelector(selector: string, options?: { state?: string; timeout?: number }): SyncLocator | null;
  goto(url: string, options?: { timeout?: number; waitUntil?: string }): SyncResponse | null;
  screenshot(options?: Record<string, unknown>): Buffer;
}

export interface SyncFrameLocator extends SyncProxy {
  locator(selector: string, options?: Record<string, unknown>): SyncLocator;
  getByRole(role: string, options?: Record<string, unknown>): SyncLocator;
  getByText(text: string | unknown, options?: { exact?: boolean }): SyncLocator;
}

export interface SyncResponse extends SyncProxy {
  status(): number;
  statusText(): string;
  ok(): boolean;
  url(): string;
  headers(): Record<string, string>;
  headerValue(name: string): string | null;
  headersArray(): { name: string; value: string }[];
  body(): Buffer;
  text(): string;
  json(): unknown;
  request(): unknown;
  securityDetails(): unknown;
  serverAddr(): unknown | null;
  timing(): Record<string, unknown>;
  fromServiceWorker(): boolean;
}

export interface SyncKeyboard {
  down(key: string): this;
  up(key: string): this;
  press(key: string, options?: { delay?: number }): this;
  type(text: string, options?: { delay?: number }): this;
  insertText(char: string): this;
}

export interface SyncMouse {
  click(x: number, y: number, options?: Record<string, unknown>): this;
  dblclick(x: number, y: number, options?: Record<string, unknown>): this;
  down(options?: Record<string, unknown>): this;
  up(options?: Record<string, unknown>): this;
  move(x: number, y: number, options?: { steps?: number }): this;
  wheel(deltaX: number, deltaY: number): this;
}

export interface SyncTouchscreen {
  tap(x: number, y: number): this;
}

export interface SyncAccessibility {
  snapshot(options?: Record<string, unknown>): unknown | null;
}

export interface SyncCoverage {
  startJSCoverage(options?: Record<string, unknown>): this;
  stopJSCoverage(): unknown[];
  startCSSCoverage(options?: Record<string, unknown>): this;
  stopCSSCoverage(): unknown[];
}

export interface SyncTracer {
  start(options?: { title?: string; snapshots?: boolean; sources?: boolean }): this;
  stop(): this;
  stopTraceChunk(options?: { path?: string }): this;
}

export function launchSyncBrowser(browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium', options?: LaunchOptions): SyncBrowser {
  const worker = new SyncWorker();
  const result = worker.sendSync({ type: 'launch', data: browserType, launchOptions: options });
  const browser = createSyncProxy((result as any).id, worker) as SyncBrowser;
  (browser as any).__worker = worker;
  return browser;
}

export function connectSyncBrowser(endpointURL: string, options?: Record<string, unknown>): SyncBrowser {
  const worker = new SyncWorker();
  const result = worker.sendSync({ type: 'connect', data: endpointURL, connectOptions: options });
  const browser = createSyncProxy((result as any).id, worker) as SyncBrowser;
  (browser as any).__worker = worker;
  return browser;
}

export function getWorker(syncObj: SyncProxy): SyncWorker {
  return (syncObj as any).__worker as SyncWorker;
}
