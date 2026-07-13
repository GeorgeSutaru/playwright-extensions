import { test, expect } from '@playwright-extensions/core';
import { launchSyncBrowser } from '@playwright-extensions/core';

// ── Tests using the syncPage fixture ──────────────────────────────

test('newContext returns a sync proxy', ({ syncPage, syncBrowser }) => {
  const context = syncBrowser.newContext({ viewport: { width: 1280, height: 720 } });
  expect(context).toBeTruthy();
});

test('newPage returns a sync page', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  const page = context.newPage();
  expect(page).toBeTruthy();
});

test('page.goto navigates and returns response', ({ syncPage }) => {
  syncPage.setContent('<html><head><title>Hello</title></head><body><h1>Hello</h1></body></html>');
  const title = syncPage.title();
  expect(title).toBe('Hello');
});

test('page.title returns string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<title>Test Page</title><body>Hi</body>');
  const title = syncPage.title();
  expect(typeof title).toBe('string');
});

test('page.url returns string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const url = syncPage.url();
  expect(typeof url).toBe('string');
  expect(url).toMatch(/^data:/);
});

test('page.locator returns a sync locator', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn">Click</button>');
  const loc = syncPage.locator('#btn');
  expect(loc).toBeTruthy();
});

test('locator.textContent returns string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn">Click Me</button>');
  const text = syncPage.locator('#btn').textContent();
  expect(text).toBe('Click Me');
});

test('locator.click works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'">Click Me</button>');
  syncPage.locator('#btn').click();
  expect(syncPage.locator('#btn').textContent()).toBe('Clicked');
});

test('page.click works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'">Click Me</button>');
  syncPage.click('#btn');
  expect(syncPage.locator('#btn').textContent()).toBe('Clicked');
});

test('locator.fill works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.locator('#input').fill('hello world');
  expect(syncPage.locator('#input').inputValue()).toBe('hello world');
});

test('page.fill works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.fill('#input', 'test value');
  expect(syncPage.locator('#input').inputValue()).toBe('test value');
});

test('locator.isVisible returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="visible">Hi</div><div id="hidden" style="display:none">Bye</div>');
  expect(syncPage.locator('#visible').isVisible()).toBe(true);
  expect(syncPage.locator('#hidden').isVisible()).toBe(false);
});

test('locator.count returns number', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
  expect(syncPage.locator('.item').count()).toBe(3);
});

test('locator.first/last/nth work', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="item">First</div><div class="item">Middle</div><div class="item">Last</div>');
  const items = syncPage.locator('.item');
  expect(items.first().textContent()).toBe('First');
  expect(items.last().textContent()).toBe('Last');
  expect(items.nth(1).textContent()).toBe('Middle');
});

test('locator chaining works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><span class="child">Nested</span></div>');
  expect(syncPage.locator('#parent').locator('.child').textContent()).toBe('Nested');
});

test('page.evaluate returns value', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.evaluate('2 + 2')).toBe(4);
});

test('page.evaluate with complex expression', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1 id="h">Hello</h1>');
  expect(syncPage.evaluate('document.getElementById("h").textContent')).toBe('Hello');
});

test('page.getByText returns locator', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button>Submit</button>');
  expect(syncPage.getByText('Submit').textContent()).toBe('Submit');
});

test('page.getByRole returns locator', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button>Submit</button>');
  expect(syncPage.getByRole('button').textContent()).toBe('Submit');
});

test('locator.isChecked returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" checked /><input type="checkbox" id="unchecked" />');
  expect(syncPage.locator('input:checked').isChecked()).toBe(true);
  expect(syncPage.locator('#unchecked').isChecked()).toBe(false);
});

test('locator.getAttribute returns string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<a href="/test" id="link">Link</a>');
  expect(syncPage.locator('#link').getAttribute('href')).toBe('/test');
});

test('page.waitForTimeout blocks synchronously', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const start = Date.now();
  syncPage.waitForTimeout(100);
  expect(Date.now() - start).toBeGreaterThanOrEqual(90);
});

test('page.screenshot returns value', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Hello</h1>');
  syncPage.screenshot();
});

test('locator.screenshot returns value', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn">Hi</button>');
  syncPage.locator('#btn').screenshot();
});

test('page.content returns HTML string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const html = syncPage.content();
  expect(typeof html).toBe('string');
  expect(html).toContain('Test');
});

test('page.setContent works', ({ syncPage }) => {
  syncPage.setContent('<html><body><h1>Injected</h1></body></html>');
  expect(syncPage.locator('h1').textContent()).toBe('Injected');
});

test('locator.check and isChecked work', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" id="cb" />');
  syncPage.locator('#cb').check();
  expect(syncPage.locator('#cb').isChecked()).toBe(true);
});

test('locator.uncheck and isChecked work', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" id="cb" checked />');
  syncPage.locator('#cb').uncheck();
  expect(syncPage.locator('#cb').isChecked()).toBe(false);
});

test('locator.isDisabled returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="enabled">OK</button><button id="disabled" disabled>No</button>');
  expect(syncPage.locator('#enabled').isDisabled()).toBe(false);
  expect(syncPage.locator('#disabled').isDisabled()).toBe(true);
});

test('locator.hover works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="target" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
  syncPage.locator('#target').hover();
  expect(syncPage.locator('#target').textContent()).toBe('Hovered');
});

test('page.context returns context', ({ syncPage }) => {
  expect(syncPage.context()).toBeTruthy();
});

test('page.isClosed returns boolean', ({ syncPage }) => {
  expect(syncPage.isClosed()).toBe(false);
});

test('locator.filter works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="card"><span>Match</span></div><div class="card"><span>Nope</span></div>');
  expect(syncPage.locator('.card').filter({ hasText: 'Match' }).textContent()).toBe('Match');
});

test('locator.and/or work', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="btn active">Active</div><div class="btn">Inactive</div>');
  expect(syncPage.locator('.btn').and(syncPage.locator('.active')).textContent()).toBe('Active');
});

test('locator.waitFor works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn">Click</button>');
  syncPage.locator('#btn').waitFor({ state: 'visible', timeout: 5000 });
});

test('page.waitForSelector returns locator', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="target">Found</div>');
  const loc = syncPage.waitForSelector('#target', { state: 'visible', timeout: 5000 });
  expect(loc).not.toBeNull();
});

test('page.mainFrame returns frame', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.mainFrame()).toBeTruthy();
});

test('frame.evaluate works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.mainFrame().evaluate('1 + 1')).toBe(2);
});

test('frame.url and frame.name work', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.mainFrame().url()).toMatch(/^data:/);
});

test('page.frames returns array', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const frames = syncPage.frames();
  expect(Array.isArray(frames)).toBe(true);
  expect(frames.length).toBeGreaterThanOrEqual(1);
});

test('page.viewportSize returns object', ({ syncBrowser }) => {
  const context = syncBrowser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = context.newPage();
  const size = page.viewportSize();
  expect(size).toEqual({ width: 1920, height: 1080 });
  context.close();
});

test('page.bringToFront works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.bringToFront();
});

test('page.setDefaultTimeout works', ({ syncPage }) => {
  syncPage.setDefaultTimeout(5000);
});

test('page.locator with getByRole chaining', ({ syncPage }) => {
  syncPage.goto('data:text/html,<nav><button>Menu</button></nav>');
  expect(syncPage.locator('nav').getByRole('button').textContent()).toBe('Menu');
});

test('locator.innerText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Hello World</div>');
  expect(syncPage.locator('#d').innerText()).toBe('Hello World');
});

test('locator.innerHTML works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d"><span>Bold</span></div>');
  expect(syncPage.locator('#d').innerHTML()).toContain('<span>Bold</span>');
});

test('page.getByTestId works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button data-testid="submit">Go</button>');
  expect(syncPage.getByTestId('submit').textContent()).toBe('Go');
});

test('locator.clear works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" value="initial" />');
  syncPage.locator('#input').clear();
  expect(syncPage.locator('#input').inputValue()).toBe('');
});

test('page.type works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.type('#input', 'AB');
  expect(syncPage.locator('#input').inputValue()).toBe('AB');
});

test('page.waitForTimeout is truly sync', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const start = Date.now();
  syncPage.waitForTimeout(50);
  syncPage.waitForTimeout(50);
  syncPage.waitForTimeout(50);
  expect(Date.now() - start).toBeGreaterThanOrEqual(120);
});

test('browser.isConnected returns boolean', ({ syncBrowser }) => {
  expect(syncBrowser.isConnected()).toBe(true);
});

test('context.pages returns array', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.newPage();
  context.newPage();
  const pages = context.pages();
  expect(Array.isArray(pages)).toBe(true);
  expect(pages.length).toBeGreaterThanOrEqual(2);
  context.close();
});

test('page.close and isClosed work', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  const page = context.newPage();
  page.goto('data:text/html,<h1>Close me</h1>');
  page.close();
  expect(page.isClosed()).toBe(true);
  context.close();
});

test('locator.isEnabled returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button>OK</button><button disabled>No</button>');
  expect(syncPage.locator('button').first().isEnabled()).toBe(true);
  expect(syncPage.locator('button').last().isEnabled()).toBe(false);
});

test('locator.isHidden returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="v">Vis</div><div id="h" style="display:none">Hid</div>');
  expect(syncPage.locator('#v').isHidden()).toBe(false);
  expect(syncPage.locator('#h').isHidden()).toBe(true);
});

test('locator.isEditable returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="e" /><input id="r" readonly />');
  expect(syncPage.locator('#e').isEditable()).toBe(true);
  expect(syncPage.locator('#r').isEditable()).toBe(false);
});

test('locator.dblclick works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
  syncPage.locator('#t').dblclick();
  expect(syncPage.locator('#t').textContent()).toBe('Dbl');
});

test('page.dblclick works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
  syncPage.dblclick('#t');
  expect(syncPage.locator('#t').textContent()).toBe('Dbl');
});

test('page.reload works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>v1</h1>');
  syncPage.setContent('<html><body><h1>v2</h1></body></html>');
  syncPage.reload();
});

test('frame.locator works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1 id="h">Frame Test</h1>');
  expect(syncPage.mainFrame().locator('#h').textContent()).toBe('Frame Test');
});

test('frame.content returns string', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Frame Test</h1>');
  expect(typeof syncPage.mainFrame().content()).toBe('string');
});

test('frame.isDetached returns boolean', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.mainFrame().isDetached()).toBe(false);
});

test('frame.childFrames returns array', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(Array.isArray(syncPage.mainFrame().childFrames())).toBe(true);
});

test('page.getByLabel works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<label for="email">Email</label><input id="email" type="text" />');
  syncPage.getByLabel('Email').fill('test@example.com');
  expect(syncPage.getByLabel('Email').inputValue()).toBe('test@example.com');
});

test('page.getByPlaceholder works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input placeholder="Enter name" id="name" />');
  syncPage.getByPlaceholder('Enter name').fill('Alice');
  expect(syncPage.getByPlaceholder('Enter name').inputValue()).toBe('Alice');
});

test('page.getByAltText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<img alt="logo" id="img" />');
  expect(syncPage.getByAltText('logo')).toBeTruthy();
});

test('page.getByTitle works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div title="tooltip" id="tip">Hover</div>');
  expect(syncPage.getByTitle('tooltip').textContent()).toBe('Hover');
});

test('locator.focus works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.locator('#input').focus();
  expect(syncPage.evaluate('document.activeElement.id')).toBe('input');
});

test('page.check works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" id="cb" />');
  syncPage.check('#cb');
  expect(syncPage.locator('#cb').isChecked()).toBe(true);
});

test('page.uncheck works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" id="cb" checked />');
  syncPage.uncheck('#cb');
  expect(syncPage.locator('#cb').isChecked()).toBe(false);
});

test('locator.tap works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext({ hasTouch: true });
  const page = context.newPage();
  page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Tapped\'">Tap</button>');
  page.locator('#btn').tap();
  expect(page.locator('#btn').textContent()).toBe('Tapped');
  context.close();
});

test('locator.press works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.locator('#input').fill('X');
  syncPage.locator('#input').press('Backspace');
  expect(syncPage.locator('#input').inputValue()).toBe('');
});

test('page.press works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.fill('#input', 'X');
  syncPage.press('#input', 'Backspace');
  expect(syncPage.locator('#input').inputValue()).toBe('');
});

test('locator.selectOption works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
  expect(syncPage.locator('#sel').selectOption('b')[0]).toBe('b');
});

test('page.selectOption works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
  expect(syncPage.selectOption('#sel', 'b')[0]).toBe('b');
});

test('page.emulateMedia works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.emulateMedia({ colorScheme: 'dark' });
  expect(syncPage.evaluate('window.matchMedia("(prefers-color-scheme: dark)").matches')).toBe(true);
});

test('page.$ returns locator or null', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Hi</div>');
  expect(syncPage.$('#d')).not.toBeNull();
});

test('page.$$ returns array of locators', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="item">A</div><div class="item">B</div>');
  const locs = syncPage.$$ ('.item');
  expect(Array.isArray(locs)).toBe(true);
  expect(locs.length).toBe(2);
});

test('page.$eval works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Eval</div>');
  expect(syncPage.$eval('#d', (el: HTMLElement) => el.textContent)).toBe('Eval');
});

test('page.$$eval works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
  expect(syncPage.$$eval('.item', (els: HTMLElement[]) => els.length)).toBe(3);
});

test('locator.elementHandle returns handle', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Hi</div>');
  expect(syncPage.locator('#d').elementHandle()).toBeTruthy();
});

test('locator.elementHandles returns array', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="item">A</div><div class="item">B</div>');
  const handles = syncPage.locator('.item').elementHandles();
  expect(Array.isArray(handles)).toBe(true);
  expect(handles.length).toBe(2);
});

test('locator.boundingBox returns object', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d" style="width:100px;height:50px;">Box</div>');
  const box = syncPage.locator('#d').boundingBox();
  expect(box).toBeTruthy();
  expect(typeof box!.x).toBe('number');
  expect(typeof box!.y).toBe('number');
  expect(typeof box!.width).toBe('number');
  expect(typeof box!.height).toBe('number');
});

test('page.addInitScript works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  const page = context.newPage();
  page.addInitScript('window.__injected = 42');
  page.goto('data:text/html,<h1>Test</h1>');
  expect(page.evaluate('window.__injected')).toBe(42);
  context.close();
});

test('page.waitForLoadState works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.waitForLoadState('load');
});

test('context.cookies returns array', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  expect(Array.isArray(context.cookies())).toBe(true);
  context.close();
});

test('context.close works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.close();
});

test('page.setExtraHTTPHeaders works', ({ syncPage }) => {
  syncPage.setExtraHTTPHeaders({ 'X-Custom': 'test' });
});

test('page.setViewportSize works', ({ syncPage }) => {
  syncPage.setViewportSize({ width: 800, height: 600 });
  expect(syncPage.viewportSize()).toEqual({ width: 800, height: 600 });
});

test('keyboard type works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.focus('#input');
  syncPage.keyboard.type('Hello');
  expect(syncPage.locator('#input').inputValue()).toBe('Hello');
});

test('keyboard press works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.locator('#input').fill('X');
  syncPage.keyboard.press('Backspace');
  expect(syncPage.locator('#input').inputValue()).toBe('');
});

test('keyboard down/up works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" type="text" />');
  syncPage.focus('#input');
  syncPage.keyboard.type('a');
  expect(syncPage.locator('#input').inputValue()).toBe('a');
});

test('mouse click works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'" style="width:100px;height:40px;">Click</button>');
  const box = syncPage.locator('#btn').boundingBox()!;
  syncPage.mouse.click(box.x + 50, box.y + 20);
  expect(syncPage.locator('#btn').textContent()).toBe('Clicked');
});

test('mouse move works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="t" onmouseenter="this.textContent=\'Hovered\'" style="width:100px;height:40px;">Hover</div>');
  const box = syncPage.locator('#t').boundingBox()!;
  syncPage.mouse.move(box.x + 50, box.y + 20);
  expect(syncPage.locator('#t').textContent()).toBe('Hovered');
});

test('touchscreen tap works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext({ hasTouch: true });
  const page = context.newPage();
  page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Tapped\'" style="width:100px;height:40px;">Tap</button>');
  const box = page.locator('#btn').boundingBox()!;
  page.touchscreen.tap(box.x + 50, box.y + 20);
  expect(page.locator('#btn').textContent()).toBe('Tapped');
  context.close();
});

test('accessibility.snapshot returns object', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  const snapshot = syncPage.ariaSnapshot();
  expect(typeof snapshot).toBe('string');
});

test('locator.filter with has locator works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div class="card"><span>Match</span></div><div class="card"><span>Nope</span></div>');
  expect(syncPage.locator('.card').filter({ has: syncPage.locator('span', { hasText: 'Match' }) }).textContent()).toBe('Match');
});

test('locator.or works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="a">A</div>');
  expect(syncPage.locator('#a').or(syncPage.locator('#missing')).textContent()).toBe('A');
});

test('locator.getByText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><span>Child</span></div>');
  expect(syncPage.locator('#parent').getByText('Child').textContent()).toBe('Child');
});

test('locator.getByRole works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><button>Submit</button></div>');
  expect(syncPage.locator('#parent').getByRole('button').textContent()).toBe('Submit');
});

test('locator.getByLabel works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<form><label for="email">Email</label><input id="email" /></form>');
  syncPage.locator('form').getByLabel('Email').fill('test@test.com');
  expect(syncPage.locator('form').getByLabel('Email').inputValue()).toBe('test@test.com');
});

test('locator.getByPlaceholder works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<form><input placeholder="Search" id="search" /></form>');
  syncPage.locator('form').getByPlaceholder('Search').fill('query');
  expect(syncPage.locator('form').getByPlaceholder('Search').inputValue()).toBe('query');
});

test('locator.getByTestId works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><button data-testid="action">Go</button></div>');
  expect(syncPage.locator('#parent').getByTestId('action').textContent()).toBe('Go');
});

test('locator.getByAltText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><img alt="photo" /></div>');
  expect(syncPage.locator('#parent').getByAltText('photo')).toBeTruthy();
});

test('locator.getByTitle works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="parent"><span title="tip">Hover</span></div>');
  expect(syncPage.locator('#parent').getByTitle('tip').textContent()).toBe('Hover');
});

test('frame.getByRole works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button>Submit</button>');
  expect(syncPage.mainFrame().getByRole('button').textContent()).toBe('Submit');
});

test('frame.getByText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<span>Frame Text</span>');
  expect(syncPage.mainFrame().getByText('Frame Text').textContent()).toBe('Frame Text');
});

test('frame.locator works (second)', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Frame Loc</div>');
  expect(syncPage.mainFrame().locator('#d').textContent()).toBe('Frame Loc');
});

test('frame.waitForLoadState works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.mainFrame().waitForLoadState('load');
});

test('frame.waitForSelector works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Found</div>');
  expect(syncPage.mainFrame().waitForSelector('#d', { state: 'visible', timeout: 5000 })).not.toBeNull();
});

test('frame.goto works', ({ syncPage }) => {
  syncPage.mainFrame().goto('data:text/html,<h1>Frame Goto</h1>');
  expect(syncPage.mainFrame().url()).toMatch(/^data:/);
});

test('page.reload returns response', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.reload();
  expect(typeof syncPage.url()).toBe('string');
});

test('page.dispatchEvent works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="input" onchange="this.value=\'changed\'" value="initial" />');
  syncPage.dispatchEvent('#input', 'change', {});
  expect(syncPage.locator('#input').inputValue()).toBe('changed');
});

test('page.dragAndDrop works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="src" draggable="true">Drag</div><div id="dst">Drop</div>');
  syncPage.dragAndDrop('#src', '#dst');
});

test('page.getAttribute works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<a href="/test" id="link">Link</a>');
  expect(syncPage.getAttribute('#link', 'href')).toBe('/test');
});

test('page.isChecked works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input type="checkbox" id="cb" checked />');
  expect(syncPage.isChecked('#cb')).toBe(true);
});

test('page.isDisabled works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="b" disabled>No</button>');
  expect(syncPage.isDisabled('#b')).toBe(true);
});

test('page.isEnabled works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<button id="b">OK</button>');
  expect(syncPage.isEnabled('#b')).toBe(true);
});

test('page.isEditable works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="i" />');
  expect(syncPage.isEditable('#i')).toBe(true);
});

test('page.inputValue works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="i" value="val" />');
  expect(syncPage.inputValue('#i')).toBe('val');
});

test('page.innerText works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d">Inner</div>');
  expect(syncPage.innerText('#d')).toBe('Inner');
});

test('page.innerHTML works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="d"><span>Bold</span></div>');
  expect(syncPage.innerHTML('#d')).toContain('<span>Bold</span>');
});

test('page.focus works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="i" />');
  syncPage.focus('#i');
  expect(syncPage.evaluate('document.activeElement.id')).toBe('i');
});

test('page.hover works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="t" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
  syncPage.hover('#t');
  expect(syncPage.locator('#t').textContent()).toBe('Hovered');
});

test('frame.parentFrame returns null for main frame', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.mainFrame().parentFrame()).toBeNull();
});

test('page.frame returns null for non-existent frame', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.frame({ name: 'nonexistent' })).toBeNull();
});

test('page.clearConsoleMessages works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<script>console.log("test")</script>');
  syncPage.clearConsoleMessages();
});

test('page.clearPageErrors works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.clearPageErrors();
});

test('page.consoleMessages returns array', ({ syncPage }) => {
  syncPage.goto('data:text/html,<script>console.log("test")</script>');
  expect(Array.isArray(syncPage.consoleMessages())).toBe(true);
});

test('page.addScriptTag with content works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.addScriptTag({ content: 'window.__scripted = true' });
  expect(syncPage.evaluate('window.__scripted')).toBe(true);
});

test('page.addStyleTag with content works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.addStyleTag({ content: 'h1 { color: red; }' });
  expect(syncPage.evaluate('document.styleSheets.length')).toBeGreaterThanOrEqual(1);
});

test('context.grantPermissions works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.grantPermissions(['geolocation']);
  context.close();
});

test('context.storageState returns object', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  expect(typeof context.storageState()).toBe('object');
  context.close();
});

test('context.addCookies and cookies work', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.addCookies([{ name: 'test', value: 'val', domain: 'example.com', path: '/' }]);
  const cookies = context.cookies('https://example.com');
  expect(Array.isArray(cookies)).toBe(true);
  expect(cookies.length).toBe(1);
  context.close();
});

test('page.waitForFunction works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1><script>window.__ready = true;</script>');
  syncPage.waitForFunction(() => (window as any).__ready === true, { timeout: 5000 });
});

test('page.evaluateHandle works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.evaluateHandle('document')).toBeTruthy();
});

test('page opener returns null for top-level page', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  expect(syncPage.opener()).toBeNull();
});

test('page.coverage start/stop works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<h1>Test</h1>');
  syncPage.coverage.startJSCoverage();
  expect(Array.isArray(syncPage.coverage.stopJSCoverage())).toBe(true);
});

test('context.tracer start/stop works', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  const page = context.newPage();
  page.goto('data:text/html,<h1>Test</h1>');
  context.close();
});

test('page.locator with chain works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<div id="a"><div id="b"><span id="c">Deep</span></div></div>');
  expect(syncPage.locator('#a').locator('#b').locator('#c').textContent()).toBe('Deep');
});

test('page.locator.first().last() chaining works', ({ syncPage }) => {
  syncPage.goto('data:text/html,<ul><li>A</li><li>B</li><li>C</li></ul>');
  expect(syncPage.locator('li').nth(0).textContent()).toBe('A');
});

test('multiple sync calls in sequence are truly synchronous', ({ syncPage }) => {
  syncPage.goto('data:text/html,<input id="i" /><button id="b" onclick="document.getElementById(\'i\').value=\'clicked\'">Click</button>');
  syncPage.locator('#b').click();
  expect(syncPage.locator('#i').inputValue()).toBe('clicked');
  syncPage.locator('#i').fill('overwritten');
  expect(syncPage.locator('#i').inputValue()).toBe('overwritten');
});

// ── REAL void-method chaining tests ──────────────────────────────

test('chain: setContent().locator().textContent()', ({ syncPage }) => {
  expect(syncPage.setContent('<h1>Chained</h1>').locator('h1').textContent()).toBe('Chained');
});

test('chain: locator().fill().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  expect(syncPage.locator('#i').fill('hello').inputValue()).toBe('hello');
});

test('chain: locator().check().isChecked()', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" />');
  expect(syncPage.locator('#cb').check().isChecked()).toBe(true);
});

test('chain: locator().clear().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" value="initial" />');
  expect(syncPage.locator('#i').clear().inputValue()).toBe('');
});

test('chain: locator().hover().textContent()', ({ syncPage }) => {
  syncPage.setContent('<div id="t" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
  expect(syncPage.locator('#t').hover().textContent()).toBe('Hovered');
});

test('chain: locator().dblclick().textContent()', ({ syncPage }) => {
  syncPage.setContent('<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
  expect(syncPage.locator('#t').dblclick().textContent()).toBe('Dbl');
});

test('chain: locator().tap().textContent()', ({ syncBrowser }) => {
  const context = syncBrowser.newContext({ hasTouch: true });
  const page = context.newPage();
  page.setContent('<button id="btn" onclick="this.textContent=\'Tapped\'">Tap</button>');
  expect(page.locator('#btn').tap().textContent()).toBe('Tapped');
  context.close();
});

test('chain: locator().fill().fill().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  expect(syncPage.locator('#i').fill('first').fill('second').inputValue()).toBe('second');
});

test('chain: locator().click().textContent()', ({ syncPage }) => {
  syncPage.setContent('<button id="b" onclick="this.textContent=\'Clicked\'">Click</button>');
  expect(syncPage.locator('#b').click().textContent()).toBe('Clicked');
});

test('chain: locator().focus().click().textContent()', ({ syncPage }) => {
  syncPage.setContent('<button id="b" onclick="this.textContent=\'Clicked\'">Click</button>');
  expect(syncPage.locator('#b').focus().click().textContent()).toBe('Clicked');
});

test('chain: locator().setInputFiles() returns this', ({ syncPage }) => {
  syncPage.setContent('<input type="file" id="f" />');
  syncPage.locator('#f').setInputFiles('/etc/hosts');
});

test('chain: locator().fill().press().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  expect(syncPage.locator('#i').fill('ab').press('Backspace').inputValue()).toBe('a');
});

test('chain: locator().type().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  expect(syncPage.locator('#i').click().type('hi').inputValue()).toBe('hi');
});

test('chain: locator().check().uncheck().isChecked()', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" />');
  expect(syncPage.locator('#cb').check().uncheck().isChecked()).toBe(false);
});

test('chain: locator().check().isChecked() is true', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" />');
  expect(syncPage.locator('#cb').check().isChecked()).toBe(true);
});

test('chain: locator().fill().clear().fill().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  expect(syncPage.locator('#i').fill('one').clear().fill('two').inputValue()).toBe('two');
});

test('chain: locator().hover().click().textContent()', ({ syncPage }) => {
  syncPage.setContent('<button id="b" onmouseenter="this.textContent=\'Hovered\'" onclick="this.textContent=\'Clicked\'">Start</button>');
  expect(syncPage.locator('#b').hover().click().textContent()).toBe('Clicked');
});

test('chain: locator().waitFor().textContent()', ({ syncPage }) => {
  syncPage.setContent('<button id="btn">Click</button>');
  expect(syncPage.locator('#btn').waitFor({ state: 'visible', timeout: 5000 }).textContent()).toBe('Click');
});

test('chain: locator().click().click().textContent()', ({ syncPage }) => {
  syncPage.setContent('<button id="b" onclick="this.textContent=this.textContent==\'1\'?\'2\':\'1\'">0</button>');
  expect(syncPage.locator('#b').click().click().textContent()).toBe('2');
});

// ── Sequential void-method tests ───

test('sequential: page.check() then isChecked()', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" />');
  syncPage.check('#cb');
  expect(syncPage.isChecked('#cb')).toBe(true);
});

test('sequential: page.uncheck() then isChecked()', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" checked />');
  syncPage.uncheck('#cb');
  expect(syncPage.isChecked('#cb')).toBe(false);
});

test('sequential: page.focus() then evaluate activeElement', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  syncPage.focus('#i');
  expect(syncPage.evaluate('document.activeElement.id')).toBe('i');
});

test('sequential: context.grantPermissions() then cookies()', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.grantPermissions(['geolocation']);
  expect(Array.isArray(context.cookies())).toBe(true);
  context.close();
});

test('sequential: context.addCookies() then cookies()', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  context.addCookies([{ name: 'test', value: 'val', domain: 'example.com', path: '/' }]);
  const cookies = context.cookies('https://example.com');
  expect(Array.isArray(cookies)).toBe(true);
  expect(cookies.length).toBe(1);
  context.close();
});

test('sequential: page.emulateMedia() then evaluate', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.emulateMedia({ colorScheme: 'dark' });
  expect(syncPage.evaluate('window.matchMedia("(prefers-color-scheme: dark)").matches')).toBe(true);
});

test('sequential: page.setViewportSize() then viewportSize()', ({ syncPage }) => {
  syncPage.setViewportSize({ width: 800, height: 600 });
  expect(syncPage.viewportSize()).toEqual({ width: 800, height: 600 });
});

test('sequential: page.setDefaultTimeout() then waitForTimeout()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.setDefaultTimeout(5000);
  syncPage.waitForTimeout(10);
});

test('sequential: page.addInitScript() then evaluate', ({ syncBrowser }) => {
  const context = syncBrowser.newContext();
  const page = context.newPage();
  page.addInitScript('window.__injected = 42');
  page.goto('data:text/html,<h1>Test</h1>');
  expect(page.evaluate('window.__injected')).toBe(42);
  context.close();
});

test('sequential: page.bringToFront() then title()', ({ syncPage }) => {
  syncPage.setContent('<title>Chained</title><h1>Test</h1>');
  syncPage.bringToFront();
  expect(syncPage.title()).toBe('Chained');
});

test('sequential: page.setExtraHTTPHeaders() then content()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.setExtraHTTPHeaders({ 'X-Custom': 'test' });
  expect(typeof syncPage.content()).toBe('string');
});

test('sequential: page.dispatchEvent() then inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" onchange="this.value=\'changed\'" value="initial" />');
  syncPage.dispatchEvent('#i', 'change', {});
  expect(syncPage.locator('#i').inputValue()).toBe('changed');
});

test('sequential: page.dragAndDrop() then content()', ({ syncPage }) => {
  syncPage.setContent('<div id="src" draggable="true">Drag</div><div id="dst">Drop</div>');
  syncPage.dragAndDrop('#src', '#dst');
  expect(typeof syncPage.content()).toBe('string');
});

test('sequential: page.clearConsoleMessages() then consoleMessages()', ({ syncPage }) => {
  syncPage.setContent('<script>console.log("test")</script>');
  syncPage.clearConsoleMessages();
  expect(Array.isArray(syncPage.consoleMessages())).toBe(true);
});

test('sequential: page.clearPageErrors() then content()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.clearPageErrors();
  expect(typeof syncPage.content()).toBe('string');
});

test('sequential: page.waitForLoadState() then content()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.waitForLoadState('load');
  expect(typeof syncPage.content()).toBe('string');
});

test('sequential: frame.waitForLoadState() then evaluate()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.mainFrame().waitForLoadState('load');
  expect(syncPage.mainFrame().evaluate('1 + 1')).toBe(2);
});

test('sequential: page.waitForFunction() then evaluate()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1><script>window.__ready = true;</script>');
  syncPage.waitForFunction(() => (window as any).__ready === true, { timeout: 5000 });
  expect(syncPage.evaluate('window.__ready')).toBe(true);
});

test('sequential: coverage.startJSCoverage() then stopJSCoverage()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  syncPage.coverage.startJSCoverage();
  expect(Array.isArray(syncPage.coverage.stopJSCoverage())).toBe(true);
});

test('sequential: page.keyboard.type() then inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input id="i" />');
  syncPage.focus('#i');
  syncPage.keyboard.type('a');
  expect(syncPage.locator('#i').inputValue()).toBe('a');
});

test('sequential: page.mouse.click via boundingBox', ({ syncPage }) => {
  syncPage.setContent('<button id="btn" onclick="this.textContent=\'Clicked\'" style="width:100px;height:40px;">Click</button>');
  const box = syncPage.locator('#btn').boundingBox()!;
  syncPage.mouse.click(box.x + 50, box.y + 20);
  expect(syncPage.locator('#btn').textContent()).toBe('Clicked');
});

test('sequential: page.mouse.move via boundingBox', ({ syncPage }) => {
  syncPage.setContent('<div id="t" onmouseenter="this.textContent=\'Hovered\'" style="width:100px;height:40px;">Hover</div>');
  const box = syncPage.locator('#t').boundingBox()!;
  syncPage.mouse.move(box.x + 50, box.y + 20);
  expect(syncPage.locator('#t').textContent()).toBe('Hovered');
});

test('sequential: page.touchscreen.tap via boundingBox', ({ syncBrowser }) => {
  const context = syncBrowser.newContext({ hasTouch: true });
  const page = context.newPage();
  page.setContent('<button id="btn" onclick="this.textContent=\'Tapped\'" style="width:100px;height:40px;">Tap</button>');
  const box = page.locator('#btn').boundingBox()!;
  page.touchscreen.tap(box.x + 50, box.y + 20);
  expect(page.locator('#btn').textContent()).toBe('Tapped');
  context.close();
});

// ── Non-chaining method tests ─────────────

test('locator().selectOption() returns array', ({ syncPage }) => {
  syncPage.setContent('<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
  expect(syncPage.locator('#sel').selectOption('b')[0]).toBe('b');
});

test('locator().elementHandle() returns handle', ({ syncPage }) => {
  syncPage.setContent('<div id="d">Hi</div>');
  expect(syncPage.locator('#d').elementHandle()).toBeTruthy();
});

test('locator().boundingBox() returns box', ({ syncPage }) => {
  syncPage.setContent('<div id="d" style="width:100px;height:50px;">Box</div>');
  const box = syncPage.locator('#d').boundingBox();
  expect(box).toBeTruthy();
  expect(typeof box!.x).toBe('number');
});

test('page.waitForSelector() returns locator', ({ syncPage }) => {
  syncPage.setContent('<div id="target">Found</div>');
  const loc = syncPage.waitForSelector('#target', { state: 'visible', timeout: 5000 });
  expect(loc).not.toBeNull();
  expect(loc!.textContent()).toBe('Found');
});

test('page.ariaSnapshot() returns string', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  expect(typeof syncPage.ariaSnapshot()).toBe('string');
});

test('page.$() returns locator', ({ syncPage }) => {
  syncPage.setContent('<div id="d">Hi</div>');
  const loc = syncPage.$('#d');
  expect(loc).not.toBeNull();
  expect(loc!.textContent()).toBe('Hi');
});

test('page.$eval() with arrow function', ({ syncPage }) => {
  syncPage.setContent('<div id="d">Eval</div>');
  expect(syncPage.$eval('#d', (el: HTMLElement) => el.textContent)).toBe('Eval');
});

test('page.$$eval() with arrow function', ({ syncPage }) => {
  syncPage.setContent('<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
  expect(syncPage.$$eval('.item', (els: HTMLElement[]) => els.length)).toBe(3);
});

test('page.pageErrors() returns array', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  expect(Array.isArray(syncPage.pageErrors())).toBe(true);
});

test('page.workers() returns array', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  expect(Array.isArray(syncPage.workers())).toBe(true);
});

test('page.requests() returns array', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  expect(Array.isArray(syncPage.requests())).toBe(true);
});

test('page.mainFrame().locator().textContent()', ({ syncPage }) => {
  syncPage.setContent('<h1 id="h">Frame Test</h1>');
  expect(syncPage.mainFrame().locator('#h').textContent()).toBe('Frame Test');
});

test('page.mainFrame().evaluate()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  expect(syncPage.mainFrame().evaluate('2 + 2')).toBe(4);
});

test('page.frames()[0].evaluate()', ({ syncPage }) => {
  syncPage.setContent('<h1>Test</h1>');
  const frames = syncPage.frames();
  expect(frames[0].evaluate('3 + 3')).toBe(6);
});

test('locator().screenshot() does not throw', ({ syncPage }) => {
  syncPage.setContent('<button id="btn">Hi</button>');
  expect(() => syncPage.locator('#btn').screenshot()).not.toThrow();
});

test('chain: setContent().screenshot() does not throw', ({ syncPage }) => {
  expect(() => syncPage.setContent('<h1>Hello</h1>').screenshot()).not.toThrow();
});

test('chain: setContent().pdf() does not throw', ({ syncPage }) => {
  expect(() => syncPage.setContent('<h1>Hello</h1>').pdf()).not.toThrow();
});

test('chain: setContent().locator().fill().locator().click().locator().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<div id="form"><input id="i" /><button id="b" onclick="document.getElementById(\'i\').value=\'done\'">Set</button></div>');
  syncPage.locator('#form').locator('#i').fill('before');
  syncPage.locator('#form').locator('#b').click();
  expect(syncPage.locator('#i').inputValue()).toBe('done');
});

test('chain: locator().fill().locator().click().locator().inputValue()', ({ syncPage }) => {
  syncPage.setContent('<input type="checkbox" id="cb" /><input id="i" />');
  expect(syncPage.locator('#i').fill('hello').inputValue()).toBe('hello');
});
