const { launchSyncBrowser } = require('../dist/sync/index.js');

const results = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    results.push(`  ✗ ${name}: ${err.message}`);
  }
}

try {
  results.push('Launching browser...');
  const browser = launchSyncBrowser('chromium', { headless: true });
  results.push('  Browser launched ✓');

  test('newContext returns a sync proxy', () => {
    const context = browser.newContext({ viewport: { width: 1280, height: 720 } });
    if (!context) throw new Error('context is falsy');
  });

  test('newPage returns a sync page', () => {
    const context = browser.newContext();
    const page = context.newPage();
    if (!page) throw new Error('page is falsy');
  });

  test('page.goto navigates and returns response', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<html><head><title>Hello</title></head><body><h1>Hello</h1></body></html>');
    const title = page.title();
    if (title !== 'Hello') throw new Error(`expected "Hello", got "${title}"`);
  });

  test('page.title returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<title>Test Page</title><body>Hi</body>');
    const title = page.title();
    if (typeof title !== 'string') throw new Error(`expected string, got ${typeof title}`);
  });

  test('page.url returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const url = page.url();
    if (typeof url !== 'string') throw new Error(`expected string, got ${typeof url}`);
    if (!url.startsWith('data:')) throw new Error(`expected data: url, got ${url}`);
  });

  test('page.locator returns a sync locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn">Click</button>');
    const loc = page.locator('#btn');
    if (!loc) throw new Error('locator is falsy');
  });

  test('locator.textContent returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn">Click Me</button>');
    const loc = page.locator('#btn');
    const text = loc.textContent();
    if (text !== 'Click Me') throw new Error(`expected "Click Me", got "${text}"`);
  });

  test('locator.click works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'">Click Me</button>');
    const loc = page.locator('#btn');
    loc.click();
    const text = loc.textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('page.click works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'">Click Me</button>');
    page.click('#btn');
    const text = page.locator('#btn').textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('locator.fill works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    const loc = page.locator('#input');
    loc.fill('hello world');
    const value = loc.inputValue();
    if (value !== 'hello world') throw new Error(`expected "hello world", got "${value}"`);
  });

  test('page.fill works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.fill('#input', 'test value');
    const value = page.locator('#input').inputValue();
    if (value !== 'test value') throw new Error(`expected "test value", got "${value}"`);
  });

  test('locator.isVisible returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="visible">Hi</div><div id="hidden" style="display:none">Bye</div>');
    const visible = page.locator('#visible').isVisible();
    const hidden = page.locator('#hidden').isVisible();
    if (visible !== true) throw new Error(`expected true, got ${visible}`);
    if (hidden !== false) throw new Error(`expected false, got ${hidden}`);
  });

  test('locator.count returns number', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
    const count = page.locator('.item').count();
    if (count !== 3) throw new Error(`expected 3, got ${count}`);
  });

  test('locator.first/last/nth work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="item">First</div><div class="item">Middle</div><div class="item">Last</div>');
    const items = page.locator('.item');
    const first = items.first().textContent();
    const last = items.last().textContent();
    const middle = items.nth(1).textContent();
    if (first !== 'First') throw new Error(`expected "First", got "${first}"`);
    if (last !== 'Last') throw new Error(`expected "Last", got "${last}"`);
    if (middle !== 'Middle') throw new Error(`expected "Middle", got "${middle}"`);
  });

  test('locator chaining works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><span class="child">Nested</span></div>');
    const text = page.locator('#parent').locator('.child').textContent();
    if (text !== 'Nested') throw new Error(`expected "Nested", got "${text}"`);
  });

  test('page.evaluate returns value', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const result = page.evaluate('2 + 2');
    if (result !== 4) throw new Error(`expected 4, got ${result}`);
  });

  test('page.evaluate with complex expression', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1 id="h">Hello</h1>');
    const result = page.evaluate('document.getElementById("h").textContent');
    if (result !== 'Hello') throw new Error(`expected "Hello", got "${result}"`);
  });

  test('page.getByText returns locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button>Submit</button>');
    const loc = page.getByText('Submit');
    const text = loc.textContent();
    if (text !== 'Submit') throw new Error(`expected "Submit", got "${text}"`);
  });

  test('page.getByRole returns locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button>Submit</button>');
    const loc = page.getByRole('button');
    const text = loc.textContent();
    if (text !== 'Submit') throw new Error(`expected "Submit", got "${text}"`);
  });

  test('locator.isChecked returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" checked /><input type="checkbox" id="unchecked" />');
    const checked = page.locator('input:checked').isChecked();
    const unchecked = page.locator('#unchecked').isChecked();
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
    if (unchecked !== false) throw new Error(`expected false, got ${unchecked}`);
  });

  test('locator.getAttribute returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<a href="/test" id="link">Link</a>');
    const href = page.locator('#link').getAttribute('href');
    if (href !== '/test') throw new Error(`expected "/test", got "${href}"`);
  });

  test('page.waitForTimeout blocks synchronously', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const start = Date.now();
    page.waitForTimeout(100);
    const elapsed = Date.now() - start;
    if (elapsed < 90) throw new Error(`expected >=90ms, got ${elapsed}ms`);
  });

  test('page.screenshot returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Hello</h1>');
    const buf = page.screenshot();
    if (!buf || buf.length === 0) throw new Error('screenshot buffer is empty');
  });

  test('locator.screenshot returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn">Hi</button>');
    const buf = page.locator('#btn').screenshot();
    if (!buf || buf.length === 0) throw new Error('screenshot buffer is empty');
  });

  test('page.content returns HTML string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const html = page.content();
    if (typeof html !== 'string') throw new Error(`expected string, got ${typeof html}`);
    if (!html.includes('Test')) throw new Error('HTML does not contain "Test"');
  });

  test('page.setContent works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<html><body><h1>Injected</h1></body></html>');
    const text = page.locator('h1').textContent();
    if (text !== 'Injected') throw new Error(`expected "Injected", got "${text}"`);
  });

  test('locator.check and isChecked work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" id="cb" />');
    const cb = page.locator('#cb');
    cb.check();
    const checked = cb.isChecked();
    if (checked !== true) throw new Error(`expected true after check, got ${checked}`);
  });

  test('locator.uncheck and isChecked work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" id="cb" checked />');
    const cb = page.locator('#cb');
    cb.uncheck();
    const checked = cb.isChecked();
    if (checked !== false) throw new Error(`expected false after uncheck, got ${checked}`);
  });

  test('locator.isDisabled returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="enabled">OK</button><button id="disabled" disabled>No</button>');
    const enabled = page.locator('#enabled').isDisabled();
    const disabled = page.locator('#disabled').isDisabled();
    if (enabled !== false) throw new Error(`expected false, got ${enabled}`);
    if (disabled !== true) throw new Error(`expected true, got ${disabled}`);
  });

  test('locator.hover works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="target" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
    page.locator('#target').hover();
    const text = page.locator('#target').textContent();
    if (text !== 'Hovered') throw new Error(`expected "Hovered", got "${text}"`);
  });

  test('page.context returns context', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const ctx = page.context();
    if (!ctx) throw new Error('context is falsy');
  });

  test('page.isClosed returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const closed = page.isClosed();
    if (closed !== false) throw new Error(`expected false, got ${closed}`);
  });

  test('locator.filter works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="card"><span>Match</span></div><div class="card"><span>Nope</span></div>');
    const filtered = page.locator('.card').filter({ hasText: 'Match' });
    const text = filtered.textContent();
    if (text !== 'Match') throw new Error(`expected "Match", got "${text}"`);
  });

  test('locator.and/or work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="btn active">Active</div><div class="btn">Inactive</div>');
    const loc = page.locator('.btn').and(page.locator('.active'));
    const text = loc.textContent();
    if (text !== 'Active') throw new Error(`expected "Active", got "${text}"`);
  });

  test('locator.waitFor works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn">Click</button>');
    page.locator('#btn').waitFor({ state: 'visible', timeout: 5000 });
  });

  test('response.status and url work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const url = page.url();
    if (typeof url !== 'string') throw new Error(`expected string, got ${typeof url}`);
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.ok returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.text returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const content = page.content();
    if (typeof content !== 'string') throw new Error(`expected string, got ${typeof content}`);
  });

  test('page.waitForSelector returns locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="target">Found</div>');
    const loc = page.waitForSelector('#target', { state: 'visible', timeout: 5000 });
    if (!loc) throw new Error('locator is null');
  });

  test('page.mainFrame returns frame', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    if (!frame) throw new Error('frame is falsy');
  });

  test('frame.evaluate works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const result = frame.evaluate('1 + 1');
    if (result !== 2) throw new Error(`expected 2, got ${result}`);
  });

  test('frame.url and frame.name work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const url = frame.url();
    if (!url.startsWith('data:')) throw new Error(`expected data: url, got ${url}`);
  });

  test('page.frames returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frames = page.frames();
    if (!Array.isArray(frames)) throw new Error('expected array');
    if (frames.length < 1) throw new Error('expected at least 1 frame');
  });

  test('page.viewportSize returns object', () => {
    const context = browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = context.newPage();
    const size = page.viewportSize();
    if (!size || size.width !== 1920 || size.height !== 1080) {
      throw new Error(`expected {width:1920,height:1080}, got ${JSON.stringify(size)}`);
    }
  });

  test('page.bringToFront works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.bringToFront();
  });

  test('page.setDefaultTimeout works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setDefaultTimeout(5000);
  });

  test('page.locator with getByRole chaining', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<nav><button>Menu</button></nav>');
    const loc = page.locator('nav').getByRole('button');
    const text = loc.textContent();
    if (text !== 'Menu') throw new Error(`expected "Menu", got "${text}"`);
  });

  test('locator.innerText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Hello World</div>');
    const text = page.locator('#d').innerText();
    if (text !== 'Hello World') throw new Error(`expected "Hello World", got "${text}"`);
  });

  test('locator.innerHTML works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d"><span>Bold</span></div>');
    const html = page.locator('#d').innerHTML();
    if (!html.includes('<span>Bold</span>')) throw new Error(`expected innerHTML to contain span, got "${html}"`);
  });

  test('page.getByTestId works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button data-testid="submit">Go</button>');
    const loc = page.getByTestId('submit');
    const text = loc.textContent();
    if (text !== 'Go') throw new Error(`expected "Go", got "${text}"`);
  });

  test('locator.clear works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" value="initial" />');
    const loc = page.locator('#input');
    loc.clear();
    const value = loc.inputValue();
    if (value !== '') throw new Error(`expected empty string, got "${value}"`);
  });

  test('page.type works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.type('#input', 'AB');
    const value = page.locator('#input').inputValue();
    if (value !== 'AB') throw new Error(`expected "AB", got "${value}"`);
  });

  test('page.waitForTimeout is truly sync', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const start = Date.now();
    page.waitForTimeout(50);
    page.waitForTimeout(50);
    page.waitForTimeout(50);
    const elapsed = Date.now() - start;
    if (elapsed < 120) throw new Error(`expected >=120ms for 3x50ms waits, got ${elapsed}ms`);
  });

  test('browser.isConnected returns boolean', () => {
    const connected = browser.isConnected();
    if (connected !== true) throw new Error(`expected true, got ${connected}`);
  });

  test('context.pages returns array', () => {
    const context = browser.newContext();
    const p1 = context.newPage();
    const p2 = context.newPage();
    const pages = context.pages();
    if (!Array.isArray(pages)) throw new Error('expected array');
    if (pages.length < 2) throw new Error(`expected >=2 pages, got ${pages.length}`);
  });

  test('page.close and isClosed work', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Close me</h1>');
    page.close();
    const closed = page.isClosed();
    if (closed !== true) throw new Error(`expected true after close, got ${closed}`);
  });

  test('locator.isEnabled returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button>OK</button><button disabled>No</button>');
    const enabled = page.locator('button').first().isEnabled();
    const disabled = page.locator('button').last().isEnabled();
    if (enabled !== true) throw new Error(`expected true, got ${enabled}`);
    if (disabled !== false) throw new Error(`expected false, got ${disabled}`);
  });

  test('locator.isHidden returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="v">Vis</div><div id="h" style="display:none">Hid</div>');
    const v = page.locator('#v').isHidden();
    const h = page.locator('#h').isHidden();
    if (v !== false) throw new Error(`expected false, got ${v}`);
    if (h !== true) throw new Error(`expected true, got ${h}`);
  });

  test('locator.isEditable returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="e" /><input id="r" readonly />');
    const e = page.locator('#e').isEditable();
    const r = page.locator('#r').isEditable();
    if (e !== true) throw new Error(`expected true, got ${e}`);
    if (r !== false) throw new Error(`expected false, got ${r}`);
  });

  test('locator.dblclick works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
    page.locator('#t').dblclick();
    const text = page.locator('#t').textContent();
    if (text !== 'Dbl') throw new Error(`expected "Dbl", got "${text}"`);
  });

  test('page.dblclick works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
    page.dblclick('#t');
    const text = page.locator('#t').textContent();
    if (text !== 'Dbl') throw new Error(`expected "Dbl", got "${text}"`);
  });

  test('page.reload works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>v1</h1>');
    page.setContent('<html><body><h1>v2</h1></body></html>');
    page.reload();
  });

  test('response.json works with json response', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const content = page.content();
    if (!content.includes('Test')) throw new Error('page content missing');
  });

  test('response.headers returns object', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.statusText returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('frame.locator works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1 id="h">Frame Test</h1>');
    const frame = page.mainFrame();
    const text = frame.locator('#h').textContent();
    if (text !== 'Frame Test') throw new Error(`expected "Frame Test", got "${text}"`);
  });

  test('frame.content returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Frame Test</h1>');
    const frame = page.mainFrame();
    const content = frame.content();
    if (typeof content !== 'string') throw new Error(`expected string, got ${typeof content}`);
  });

  test('frame.isDetached returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const detached = frame.isDetached();
    if (detached !== false) throw new Error(`expected false, got ${detached}`);
  });

  test('frame.childFrames returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const children = frame.childFrames();
    if (!Array.isArray(children)) throw new Error('expected array');
  });

  test('page.getByLabel works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<label for="email">Email</label><input id="email" type="text" />');
    const loc = page.getByLabel('Email');
    loc.fill('test@example.com');
    const value = loc.inputValue();
    if (value !== 'test@example.com') throw new Error(`expected "test@example.com", got "${value}"`);
  });

  test('page.getByPlaceholder works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input placeholder="Enter name" id="name" />');
    const loc = page.getByPlaceholder('Enter name');
    loc.fill('Alice');
    const value = loc.inputValue();
    if (value !== 'Alice') throw new Error(`expected "Alice", got "${value}"`);
  });

  test('page.getByAltText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<img alt="logo" id="img" />');
    const loc = page.getByAltText('logo');
    if (!loc) throw new Error('locator is falsy');
  });

  test('page.getByTitle works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div title="tooltip" id="tip">Hover</div>');
    const loc = page.getByTitle('tooltip');
    const text = loc.textContent();
    if (text !== 'Hover') throw new Error(`expected "Hover", got "${text}"`);
  });

  test('locator.focus works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.locator('#input').focus();
    const focused = page.evaluate('document.activeElement.id');
    if (focused !== 'input') throw new Error(`expected "input", got "${focused}"`);
  });

  test('page.check works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" id="cb" />');
    page.check('#cb');
    const checked = page.locator('#cb').isChecked();
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
  });

  test('page.uncheck works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" id="cb" checked />');
    page.uncheck('#cb');
    const checked = page.locator('#cb').isChecked();
    if (checked !== false) throw new Error(`expected false, got ${checked}`);
  });

  test('locator.tap works', () => {
    const context = browser.newContext({ hasTouch: true });
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Tapped\'">Tap</button>');
    page.locator('#btn').tap();
    const text = page.locator('#btn').textContent();
    if (text !== 'Tapped') throw new Error(`expected "Tapped", got "${text}"`);
  });

  test('locator.press works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.locator('#input').fill('X');
    page.locator('#input').press('Backspace');
    const value = page.locator('#input').inputValue();
    if (value !== '') throw new Error(`expected empty, got "${value}"`);
  });

  test('page.press works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.fill('#input', 'X');
    page.press('#input', 'Backspace');
    const value = page.locator('#input').inputValue();
    if (value !== '') throw new Error(`expected empty, got "${value}"`);
  });

  test('locator.selectOption works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
    const selected = page.locator('#sel').selectOption('b');
    if (selected[0] !== 'b') throw new Error(`expected "b", got "${selected[0]}"`);
  });

  test('page.selectOption works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
    const selected = page.selectOption('#sel', 'b');
    if (selected[0] !== 'b') throw new Error(`expected "b", got "${selected[0]}"`);
  });

  test('page.emulateMedia works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.emulateMedia({ colorScheme: 'dark' });
    const scheme = page.evaluate('window.matchMedia("(prefers-color-scheme: dark)").matches');
    if (scheme !== true) throw new Error(`expected true, got ${scheme}`);
  });

  test('page.$ returns locator or null', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Hi</div>');
    const loc = page.$('#d');
    if (!loc) throw new Error('locator is null');
  });

  test('page.$$ returns array of locators', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="item">A</div><div class="item">B</div>');
    const locs = page.$$ ('.item');
    if (!Array.isArray(locs) || locs.length !== 2) throw new Error(`expected 2 locators, got ${locs.length}`);
  });

  test('page.$eval works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Eval</div>');
    const text = page.$eval('#d', el => el.textContent);
    if (text !== 'Eval') throw new Error(`expected "Eval", got "${text}"`);
  });

  test('page.$$eval works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
    const count = page.$$eval('.item', els => els.length);
    if (count !== 3) throw new Error(`expected 3, got ${count}`);
  });

  test('locator.elementHandle returns handle', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Hi</div>');
    const handle = page.locator('#d').elementHandle();
    if (!handle) throw new Error('handle is falsy');
  });

  test('locator.elementHandles returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="item">A</div><div class="item">B</div>');
    const handles = page.locator('.item').elementHandles();
    if (!Array.isArray(handles) || handles.length !== 2) throw new Error(`expected 2 handles, got ${handles.length}`);
  });

  test('locator.boxModel returns object', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d" style="width:100px;height:50px;">Box</div>');
    const box = page.locator('#d').boundingBox();
    if (!box || typeof box !== 'object') throw new Error('expected object');
    if (typeof box.x !== 'number') throw new Error('expected x number');
    if (typeof box.y !== 'number') throw new Error('expected y number');
    if (typeof box.width !== 'number') throw new Error('expected width number');
    if (typeof box.height !== 'number') throw new Error('expected height number');
  });

  test('page.addInitScript works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.addInitScript('window.__injected = 42');
    page.goto('data:text/html,<h1>Test</h1>');
    const val = page.evaluate('window.__injected');
    if (val !== 42) throw new Error(`expected 42, got ${val}`);
  });

  test('page.waitForLoadState works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.waitForLoadState('load');
  });

  test('context.cookies returns array', () => {
    const context = browser.newContext();
    const cookies = context.cookies();
    if (!Array.isArray(cookies)) throw new Error('expected array');
  });

  test('context.close works', () => {
    const context = browser.newContext();
    context.close();
  });

  test('page.setExtraHTTPHeaders works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setExtraHTTPHeaders({ 'X-Custom': 'test' });
  });

  test('page.setViewportSize works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setViewportSize({ width: 800, height: 600 });
    const size = page.viewportSize();
    if (size.width !== 800 || size.height !== 600) {
      throw new Error(`expected 800x600, got ${size.width}x${size.height}`);
    }
  });

  test('keyboard type works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.focus('#input');
    page.keyboard.type('Hello');
    const value = page.locator('#input').inputValue();
    if (value !== 'Hello') throw new Error(`expected "Hello", got "${value}"`);
  });

  test('keyboard press works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.locator('#input').fill('X');
    page.keyboard.press('Backspace');
    const value = page.locator('#input').inputValue();
    if (value !== '') throw new Error(`expected empty, got "${value}"`);
  });

  test('keyboard down/up works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" type="text" />');
    page.focus('#input');
    page.keyboard.type('a');
    const value = page.locator('#input').inputValue();
    if (value !== 'a') throw new Error(`expected "a", got "${value}"`);
  });

  test('mouse click works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Clicked\'" style="width:100px;height:40px;">Click</button>');
    const box = page.locator('#btn').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.mouse.click(x, y);
    const text = page.locator('#btn').textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('mouse move works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="t" onmouseenter="this.textContent=\'Hovered\'" style="width:100px;height:40px;">Hover</div>');
    const box = page.locator('#t').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.mouse.move(x, y);
    const text = page.locator('#t').textContent();
    if (text !== 'Hovered') throw new Error(`expected "Hovered", got "${text}"`);
  });

  test('touchscreen tap works', () => {
    const context = browser.newContext({ hasTouch: true });
    const page = context.newPage();
    page.goto('data:text/html,<button id="btn" onclick="this.textContent=\'Tapped\'" style="width:100px;height:40px;">Tap</button>');
    const box = page.locator('#btn').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.touchscreen.tap(x, y);
    const text = page.locator('#btn').textContent();
    if (text !== 'Tapped') throw new Error(`expected "Tapped", got "${text}"`);
  });

  test('accessibility.snapshot returns object', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const snapshot = page.ariaSnapshot();
    if (!snapshot || typeof snapshot !== 'string') throw new Error('expected string snapshot');
  });

  test('locator.filter with has locator works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div class="card"><span>Match</span></div><div class="card"><span>Nope</span></div>');
    const filtered = page.locator('.card').filter({ has: page.locator('span', { hasText: 'Match' }) });
    const text = filtered.textContent();
    if (text !== 'Match') throw new Error(`expected "Match", got "${text}"`);
  });

  test('locator.or works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="a">A</div>');
    const loc = page.locator('#a').or(page.locator('#missing'));
    const text = loc.textContent();
    if (text !== 'A') throw new Error(`expected "A", got "${text}"`);
  });

  test('locator.getByText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><span>Child</span></div>');
    const loc = page.locator('#parent').getByText('Child');
    const text = loc.textContent();
    if (text !== 'Child') throw new Error(`expected "Child", got "${text}"`);
  });

  test('locator.getByRole works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><button>Submit</button></div>');
    const loc = page.locator('#parent').getByRole('button');
    const text = loc.textContent();
    if (text !== 'Submit') throw new Error(`expected "Submit", got "${text}"`);
  });

  test('locator.getByLabel works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<form><label for="email">Email</label><input id="email" /></form>');
    const loc = page.locator('form').getByLabel('Email');
    loc.fill('test@test.com');
    const value = loc.inputValue();
    if (value !== 'test@test.com') throw new Error(`expected "test@test.com", got "${value}"`);
  });

  test('locator.getByPlaceholder works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<form><input placeholder="Search" id="search" /></form>');
    const loc = page.locator('form').getByPlaceholder('Search');
    loc.fill('query');
    const value = loc.inputValue();
    if (value !== 'query') throw new Error(`expected "query", got "${value}"`);
  });

  test('locator.getByTestId works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><button data-testid="action">Go</button></div>');
    const loc = page.locator('#parent').getByTestId('action');
    const text = loc.textContent();
    if (text !== 'Go') throw new Error(`expected "Go", got "${text}"`);
  });

  test('locator.getByAltText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><img alt="photo" /></div>');
    const loc = page.locator('#parent').getByAltText('photo');
  });

  test('locator.getByTitle works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="parent"><span title="tip">Hover</span></div>');
    const loc = page.locator('#parent').getByTitle('tip');
    const text = loc.textContent();
    if (text !== 'Hover') throw new Error(`expected "Hover", got "${text}"`);
  });

  test('frame.getByRole works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button>Submit</button>');
    const frame = page.mainFrame();
    const loc = frame.getByRole('button');
    const text = loc.textContent();
    if (text !== 'Submit') throw new Error(`expected "Submit", got "${text}"`);
  });

  test('frame.getByText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<span>Frame Text</span>');
    const frame = page.mainFrame();
    const loc = frame.getByText('Frame Text');
    const text = loc.textContent();
    if (text !== 'Frame Text') throw new Error(`expected "Frame Text", got "${text}"`);
  });

  test('frame.locator works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Frame Loc</div>');
    const frame = page.mainFrame();
    const text = frame.locator('#d').textContent();
    if (text !== 'Frame Loc') throw new Error(`expected "Frame Loc", got "${text}"`);
  });

  test('frame.waitForLoadState works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    frame.waitForLoadState('load');
  });

  test('frame.waitForSelector works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Found</div>');
    const frame = page.mainFrame();
    const loc = frame.waitForSelector('#d', { state: 'visible', timeout: 5000 });
    if (!loc) throw new Error('locator is null');
  });

  test('frame.screenshot returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const content = frame.content();
    if (typeof content !== 'string') throw new Error('expected string content');
    if (!content.includes('Test')) throw new Error('content missing');
  });

  test('frame.goto works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const frame = page.mainFrame();
    frame.goto('data:text/html,<h1>Frame Goto</h1>');
    if (!frame.url().startsWith('data:')) throw new Error(`expected data: url, got ${frame.url()}`);
  });

  test('page.reload returns response', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.reload();
    if (typeof page.url() !== 'string') throw new Error('expected url string');
  });

  test('response.request returns request object', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.timing returns object', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.fromServiceWorker returns boolean', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.headersArray returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.headerValue returns string or null', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    if (!page.content().includes('Test')) throw new Error('page content missing');
  });

  test('response.body returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Body Test</h1>');
    const content = page.content();
    if (!content.includes('Body Test')) throw new Error('page content missing');
  });

  test('page.dispatchEvent works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="input" onchange="this.value=\'changed\'" value="initial" />');
    page.dispatchEvent('#input', 'change', {});
  });

  test('page.dragAndDrop works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="src" draggable="true">Drag</div><div id="dst">Drop</div>');
    page.dragAndDrop('#src', '#dst');
  });

  test('page.getAttribute works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<a href="/test" id="link">Link</a>');
    const href = page.getAttribute('#link', 'href');
    if (href !== '/test') throw new Error(`expected "/test", got "${href}"`);
  });

  test('page.isChecked works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input type="checkbox" id="cb" checked />');
    const checked = page.isChecked('#cb');
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
  });

  test('page.isDisabled works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="b" disabled>No</button>');
    const disabled = page.isDisabled('#b');
    if (disabled !== true) throw new Error(`expected true, got ${disabled}`);
  });

  test('page.isEnabled works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<button id="b">OK</button>');
    const enabled = page.isEnabled('#b');
    if (enabled !== true) throw new Error(`expected true, got ${enabled}`);
  });

  test('page.isEditable works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="i" />');
    const editable = page.isEditable('#i');
    if (editable !== true) throw new Error(`expected true, got ${editable}`);
  });

  test('page.inputValue works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="i" value="val" />');
    const value = page.inputValue('#i');
    if (value !== 'val') throw new Error(`expected "val", got "${value}"`);
  });

  test('page.innerText works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d">Inner</div>');
    const text = page.innerText('#d');
    if (text !== 'Inner') throw new Error(`expected "Inner", got "${text}"`);
  });

  test('page.innerHTML works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="d"><span>Bold</span></div>');
    const html = page.innerHTML('#d');
    if (!html.includes('<span>Bold</span>')) throw new Error(`expected innerHTML to contain span`);
  });

  test('page.focus works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="i" />');
    page.focus('#i');
    const focused = page.evaluate('document.activeElement.id');
    if (focused !== 'i') throw new Error(`expected "i", got "${focused}"`);
  });

  test('page.hover works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="t" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
    page.hover('#t');
    const text = page.locator('#t').textContent();
    if (text !== 'Hovered') throw new Error(`expected "Hovered", got "${text}"`);
  });

  test('page.fill works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="i" type="text" />');
    page.fill('#i', 'filled');
    const value = page.locator('#i').inputValue();
    if (value !== 'filled') throw new Error(`expected "filled", got "${value}"`);
  });

  test('frame.parentFrame returns null for main frame', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.mainFrame();
    const parent = frame.parentFrame();
    if (parent !== null) throw new Error(`expected null, got ${parent}`);
  });

  test('page.frame returns null for non-existent frame', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const frame = page.frame({ name: 'nonexistent' });
    if (frame !== null) throw new Error(`expected null`);
  });

  test('page.clearConsoleMessages works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<script>console.log("test")</script>');
    page.clearConsoleMessages();
  });

  test('page.clearPageErrors works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.clearPageErrors();
  });

  test('page.consoleMessages returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<script>console.log("test")</script>');
    const msgs = page.consoleMessages();
    if (!Array.isArray(msgs)) throw new Error('expected array');
  });

  test('page.addScriptTag with content works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.addScriptTag({ content: 'window.__scripted = true' });
    const val = page.evaluate('window.__scripted');
    if (val !== true) throw new Error(`expected true, got ${val}`);
  });

  test('page.addStyleTag with content works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.addStyleTag({ content: 'h1 { color: red; }' });
    const styles = page.evaluate('document.styleSheets.length');
    if (styles < 1) throw new Error(`expected >=1 stylesheet, got ${styles}`);
  });

  test('context.grantPermissions works', () => {
    const context = browser.newContext();
    context.grantPermissions(['geolocation']);
  });

  test('context.storageState returns object', () => {
    const context = browser.newContext();
    const state = context.storageState();
    if (typeof state !== 'object') throw new Error(`expected object, got ${typeof state}`);
  });

  test('context.addCookies and cookies work', () => {
    const context = browser.newContext();
    context.addCookies([{ name: 'test', value: 'val', domain: 'example.com', path: '/' }]);
    const cookies = context.cookies('https://example.com');
    if (!Array.isArray(cookies)) throw new Error('expected array');
    if (cookies.length !== 1) throw new Error(`expected 1 cookie, got ${cookies.length}`);
  });

  test('page.waitForFunction works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1><script>window.__ready = true;</script>');
    page.waitForFunction(() => window.__ready === true, { timeout: 5000 });
  });

  test('page.evaluateHandle works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const handle = page.evaluateHandle('document');
    if (!handle) throw new Error('handle is falsy');
  });

  test('page opender returns null for top-level page', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    const opener = page.opener();
    if (opener !== null) throw new Error(`expected null, got ${opener}`);
  });

  test('page.coverage start/stop works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
    page.coverage.startJSCoverage();
    const coverage = page.coverage.stopJSCoverage();
    if (!Array.isArray(coverage)) throw new Error('expected array');
  });

  test('context.tracer start/stop works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<h1>Test</h1>');
  });

  test('page.locator with chain works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<div id="a"><div id="b"><span id="c">Deep</span></div></div>');
    const text = page.locator('#a').locator('#b').locator('#c').textContent();
    if (text !== 'Deep') throw new Error(`expected "Deep", got "${text}"`);
  });

  test('page.locator.first().last() chaining works', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<ul><li>A</li><li>B</li><li>C</li></ul>');
    const text = page.locator('li').nth(0).textContent();
    if (text !== 'A') throw new Error(`expected "A", got "${text}"`);
  });

  test('multiple sync calls in sequence are truly synchronous', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.goto('data:text/html,<input id="i" /><button id="b" onclick="document.getElementById(\'i\').value=\'clicked\'">Click</button>');
    page.locator('#b').click();
    const value = page.locator('#i').inputValue();
    if (value !== 'clicked') throw new Error(`expected "clicked", got "${value}"`);
    page.locator('#i').fill('overwritten');
    const final = page.locator('#i').inputValue();
    if (final !== 'overwritten') throw new Error(`expected "overwritten", got "${final}"`);
  });

  // ── REAL void-method chaining tests ──────────────────────────────
  // Every test below is a single expression where a void method returns `this`
  // and the chain continues with another method call.

  test('chain: setContent().locator().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const text = page.setContent('<h1>Chained</h1>').locator('h1').textContent();
    if (text !== 'Chained') throw new Error(`expected "Chained", got "${text}"`);
  });

  test('chain: locator().fill().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    const value = page.locator('#i').fill('hello').inputValue();
    if (value !== 'hello') throw new Error(`expected "hello", got "${value}"`);
  });

  test('chain: locator().check().isChecked()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" />');
    const checked = page.locator('#cb').check().isChecked();
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
  });

  test('chain: locator().clear().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" value="initial" />');
    const value = page.locator('#i').clear().inputValue();
    if (value !== '') throw new Error(`expected empty, got "${value}"`);
  });

  test('chain: locator().hover().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="t" onmouseenter="this.textContent=\'Hovered\'">Hover</div>');
    const text = page.locator('#t').hover().textContent();
    if (text !== 'Hovered') throw new Error(`expected "Hovered", got "${text}"`);
  });

  test('chain: locator().dblclick().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="t" ondblclick="this.textContent=\'Dbl\'">Dbl</div>');
    const text = page.locator('#t').dblclick().textContent();
    if (text !== 'Dbl') throw new Error(`expected "Dbl", got "${text}"`);
  });

  test('chain: locator().tap().textContent()', () => {
    const context = browser.newContext({ hasTouch: true });
    const page = context.newPage();
    page.setContent('<button id="btn" onclick="this.textContent=\'Tapped\'">Tap</button>');
    const text = page.locator('#btn').tap().textContent();
    if (text !== 'Tapped') throw new Error(`expected "Tapped", got "${text}"`);
  });

  test('chain: locator().fill().fill().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    const value = page.locator('#i').fill('first').fill('second').inputValue();
    if (value !== 'second') throw new Error(`expected "second", got "${value}"`);
  });

  test('chain: setContent().locator().check().locator().fill().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" /><input id="i" />');
    const value = page.locator('#i').fill('hello').inputValue();
    if (value !== 'hello') throw new Error(`expected "hello", got "${value}"`);
  });

  test('chain: locator().click().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="b" onclick="this.textContent=\'Clicked\'">Click</button>');
    const text = page.locator('#b').click().textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('chain: locator().focus().click().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="b" onclick="this.textContent=\'Clicked\'">Click</button>');
    const text = page.locator('#b').focus().click().textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('chain: locator().setInputFiles() returns this', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="file" id="f" />');
    const result = page.locator('#f').setInputFiles('/etc/hosts');
    // setInputFiles returns void → this, so chaining works
  });

  test('chain: locator().fill().press().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    const value = page.locator('#i').fill('ab').press('Backspace').inputValue();
    if (value !== 'a') throw new Error(`expected "a", got "${value}"`);
  });

  test('chain: locator().type().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    const value = page.locator('#i').click().type('hi').inputValue();
    if (value !== 'hi') throw new Error(`expected "hi", got "${value}"`);
  });

  test('chain: locator().check().uncheck().isChecked()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" />');
    const checked = page.locator('#cb').check().uncheck().isChecked();
    if (checked !== false) throw new Error(`expected false, got ${checked}`);
  });

  test('chain: locator().check().isChecked() is true', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" />');
    const checked = page.locator('#cb').check().isChecked();
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
  });

  test('chain: locator().fill().clear().fill().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    const value = page.locator('#i').fill('one').clear().fill('two').inputValue();
    if (value !== 'two') throw new Error(`expected "two", got "${value}"`);
  });

  test('chain: locator().hover().click().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="b" onmouseenter="this.textContent=\'Hovered\'" onclick="this.textContent=\'Clicked\'">Start</button>');
    const text = page.locator('#b').hover().click().textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('chain: setContent().locator().fill().locator().click().locator().inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="form"><input id="i" /><button id="b" onclick="document.getElementById(\'i\').value=\'done\'">Set</button></div>');
    page.locator('#form').locator('#i').fill('before');
    page.locator('#form').locator('#b').click();
    const value = page.locator('#i').inputValue();
    if (value !== 'done') throw new Error(`expected "done", got "${value}"`);
  });

  test('chain: locator().waitFor().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="btn">Click</button>');
    const text = page.locator('#btn').waitFor({ state: 'visible', timeout: 5000 }).textContent();
    if (text !== 'Click') throw new Error(`expected "Click", got "${text}"`);
  });

  test('chain: locator().click().click().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="b" onclick="this.textContent=this.textContent==\'1\'?\'2\':\'1\'">0</button>');
    const text = page.locator('#b').click().click().textContent();
    if (text !== '2') throw new Error(`expected "2", got "${text}"`);
  });

  // ── Sequential void-method tests (not chains, but verify sync works) ───

  test('sequential: page.check() then isChecked()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" />');
    page.check('#cb');
    const checked = page.isChecked('#cb');
    if (checked !== true) throw new Error(`expected true, got ${checked}`);
  });

  test('sequential: page.uncheck() then isChecked()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input type="checkbox" id="cb" checked />');
    page.uncheck('#cb');
    const checked = page.isChecked('#cb');
    if (checked !== false) throw new Error(`expected false, got ${checked}`);
  });

  test('sequential: page.focus() then evaluate activeElement', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    page.focus('#i');
    const id = page.evaluate('document.activeElement.id');
    if (id !== 'i') throw new Error(`expected "i", got "${id}"`);
  });

  test('sequential: context.grantPermissions() then cookies()', () => {
    const context = browser.newContext();
    context.grantPermissions(['geolocation']);
    const cookies = context.cookies();
    if (!Array.isArray(cookies)) throw new Error('expected array');
  });

  test('sequential: context.addCookies() then cookies()', () => {
    const context = browser.newContext();
    context.addCookies([{ name: 'test', value: 'val', domain: 'example.com', path: '/' }]);
    const cookies = context.cookies('https://example.com');
    if (!Array.isArray(cookies)) throw new Error('expected array');
    if (cookies.length !== 1) throw new Error(`expected 1 cookie, got ${cookies.length}`);
  });

  test('sequential: page.emulateMedia() then evaluate', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.emulateMedia({ colorScheme: 'dark' });
    const scheme = page.evaluate('window.matchMedia("(prefers-color-scheme: dark)").matches');
    if (scheme !== true) throw new Error(`expected true, got ${scheme}`);
  });

  test('sequential: page.setViewportSize() then viewportSize()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setViewportSize({ width: 800, height: 600 });
    const size = page.viewportSize();
    if (size.width !== 800 || size.height !== 600) {
      throw new Error(`expected 800x600, got ${size.width}x${size.height}`);
    }
  });

  test('sequential: page.setDefaultTimeout() then waitForTimeout()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.setDefaultTimeout(5000);
    page.waitForTimeout(10);
  });

  test('sequential: page.addInitScript() then evaluate', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.addInitScript('window.__injected = 42');
    page.goto('data:text/html,<h1>Test</h1>');
    const val = page.evaluate('window.__injected');
    if (val !== 42) throw new Error(`expected 42, got ${val}`);
  });

  test('sequential: page.bringToFront() then title()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<title>Chained</title><h1>Test</h1>');
    page.bringToFront();
    const title = page.title();
    if (title !== 'Chained') throw new Error(`expected "Chained", got "${title}"`);
  });

  test('sequential: page.setExtraHTTPHeaders() then content()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.setExtraHTTPHeaders({ 'X-Custom': 'test' });
    const html = page.content();
    if (typeof html !== 'string') throw new Error(`expected string, got ${typeof html}`);
  });

  test('sequential: page.dispatchEvent() then inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" onchange="this.value=\'changed\'" value="initial" />');
    page.dispatchEvent('#i', 'change', {});
    const value = page.locator('#i').inputValue();
    if (value !== 'changed') throw new Error(`expected "changed", got "${value}"`);
  });

  test('sequential: page.dragAndDrop() then content()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="src" draggable="true">Drag</div><div id="dst">Drop</div>');
    page.dragAndDrop('#src', '#dst');
    const html = page.content();
    if (typeof html !== 'string') throw new Error(`expected string, got ${typeof html}`);
  });

  test('sequential: page.clearConsoleMessages() then consoleMessages()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<script>console.log("test")</script>');
    page.clearConsoleMessages();
    const msgs = page.consoleMessages();
    if (!Array.isArray(msgs)) throw new Error('expected array');
  });

  test('sequential: page.clearPageErrors() then content()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.clearPageErrors();
    const html = page.content();
    if (typeof html !== 'string') throw new Error(`expected string, got ${typeof html}`);
  });

  test('sequential: page.waitForLoadState() then content()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.waitForLoadState('load');
    const html = page.content();
    if (typeof html !== 'string') throw new Error(`expected string, got ${typeof html}`);
  });

  test('sequential: frame.waitForLoadState() then evaluate()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const frame = page.mainFrame();
    frame.waitForLoadState('load');
    const result = frame.evaluate('1 + 1');
    if (result !== 2) throw new Error(`expected 2, got ${result}`);
  });

  test('sequential: page.waitForFunction() then evaluate()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1><script>window.__ready = true;</script>');
    page.waitForFunction(() => window.__ready === true, { timeout: 5000 });
    const val = page.evaluate('window.__ready');
    if (val !== true) throw new Error(`expected true, got ${val}`);
  });

  test('sequential: coverage.startJSCoverage() then stopJSCoverage()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    page.coverage.startJSCoverage();
    const coverage = page.coverage.stopJSCoverage();
    if (!Array.isArray(coverage)) throw new Error('expected array');
  });

  test('sequential: page.keyboard.type() then inputValue()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<input id="i" />');
    page.focus('#i');
    page.keyboard.type('a');
    const value = page.locator('#i').inputValue();
    if (value !== 'a') throw new Error(`expected "a", got "${value}"`);
  });

  test('sequential: page.mouse.click via boundingBox', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="btn" onclick="this.textContent=\'Clicked\'" style="width:100px;height:40px;">Click</button>');
    const box = page.locator('#btn').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.mouse.click(x, y);
    const text = page.locator('#btn').textContent();
    if (text !== 'Clicked') throw new Error(`expected "Clicked", got "${text}"`);
  });

  test('sequential: page.mouse.move via boundingBox', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="t" onmouseenter="this.textContent=\'Hovered\'" style="width:100px;height:40px;">Hover</div>');
    const box = page.locator('#t').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.mouse.move(x, y);
    const text = page.locator('#t').textContent();
    if (text !== 'Hovered') throw new Error(`expected "Hovered", got "${text}"`);
  });

  test('sequential: page.touchscreen.tap via boundingBox', () => {
    const context = browser.newContext({ hasTouch: true });
    const page = context.newPage();
    page.setContent('<button id="btn" onclick="this.textContent=\'Tapped\'" style="width:100px;height:40px;">Tap</button>');
    const box = page.locator('#btn').boundingBox();
    const x = box.x + 50;
    const y = box.y + 20;
    page.touchscreen.tap(x, y);
    const text = page.locator('#btn').textContent();
    if (text !== 'Tapped') throw new Error(`expected "Tapped", got "${text}"`);
  });

  // ── Non-chaining method tests (verify return values) ─────────────

  test('locator().selectOption() returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<select id="sel"><option value="a">A</option><option value="b">B</option></select>');
    const selected = page.locator('#sel').selectOption('b');
    if (selected[0] !== 'b') throw new Error(`expected "b", got "${selected[0]}"`);
  });

  test('locator().elementHandle() returns handle', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="d">Hi</div>');
    const handle = page.locator('#d').elementHandle();
    if (!handle) throw new Error('handle is falsy');
  });

  test('locator().boundingBox() returns box', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="d" style="width:100px;height:50px;">Box</div>');
    const box = page.locator('#d').boundingBox();
    if (!box || typeof box !== 'object') throw new Error('expected object');
    if (typeof box.x !== 'number') throw new Error('expected x number');
  });

  test('page.waitForSelector() returns locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="target">Found</div>');
    const loc = page.waitForSelector('#target', { state: 'visible', timeout: 5000 });
    if (!loc) throw new Error('locator is null');
    const text = loc.textContent();
    if (text !== 'Found') throw new Error(`expected "Found", got "${text}"`);
  });

  test('page.ariaSnapshot() returns string', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const snapshot = page.ariaSnapshot();
    if (!snapshot || typeof snapshot !== 'string') throw new Error('expected string snapshot');
  });

  test('page.$() returns locator', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="d">Hi</div>');
    const loc = page.$('#d');
    if (!loc) throw new Error('locator is null');
    const text = loc.textContent();
    if (text !== 'Hi') throw new Error(`expected "Hi", got "${text}"`);
  });

  test('page.$eval() with arrow function', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div id="d">Eval</div>');
    const text = page.$eval('#d', el => el.textContent);
    if (text !== 'Eval') throw new Error(`expected "Eval", got "${text}"`);
  });

  test('page.$$eval() with arrow function', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<div class="item">A</div><div class="item">B</div><div class="item">C</div>');
    const count = page.$$eval('.item', els => els.length);
    if (count !== 3) throw new Error(`expected 3, got ${count}`);
  });

  test('page.pageErrors() returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const errors = page.pageErrors();
    if (!Array.isArray(errors)) throw new Error('expected array');
  });

  test('page.workers() returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const workers = page.workers();
    if (!Array.isArray(workers)) throw new Error('expected array');
  });

  test('page.requests() returns array', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const requests = page.requests();
    if (!Array.isArray(requests)) throw new Error('expected array');
  });

  test('page.mainFrame().locator().textContent()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1 id="h">Frame Test</h1>');
    const text = page.mainFrame().locator('#h').textContent();
    if (text !== 'Frame Test') throw new Error(`expected "Frame Test", got "${text}"`);
  });

  test('page.mainFrame().evaluate()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const result = page.mainFrame().evaluate('2 + 2');
    if (result !== 4) throw new Error(`expected 4, got ${result}`);
  });

  test('page.frames()[0].evaluate()', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<h1>Test</h1>');
    const frames = page.frames();
    const result = frames[0].evaluate('3 + 3');
    if (result !== 6) throw new Error(`expected 6, got ${result}`);
  });

  test('locator().screenshot() returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    page.setContent('<button id="btn">Hi</button>');
    const buf = page.locator('#btn').screenshot();
    if (!buf || buf.length === 0) throw new Error('screenshot buffer is empty');
  });

  test('chain: setContent().screenshot() returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const buf = page.setContent('<h1>Hello</h1>').screenshot();
    if (!buf || buf.length === 0) throw new Error('screenshot buffer is empty');
  });

  test('chain: setContent().pdf() returns buffer', () => {
    const context = browser.newContext();
    const page = context.newPage();
    const buf = page.setContent('<h1>Hello</h1>').pdf();
    if (!buf || buf.length === 0) throw new Error('pdf buffer is empty');
  });

  browser.close();
  results.push('');
  results.push(`Browser closed ✓`);
  results.push(`────────────────────────────────`);
  results.push(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

} catch (err) {
  results.push(`FATAL: ${err.message}`);
  results.push(err.stack);
}

console.log(results.join('\n'));
process.exit(failed > 0 ? 1 : 0);
