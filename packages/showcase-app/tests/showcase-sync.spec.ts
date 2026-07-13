import { test, expect } from '@playwright-extensions/core';

const BASE_URL = 'http://localhost:8300';

test.describe('Basic page load', () => {
  test('page loads and shows title', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).title()).toContain('Showcase');
  });

  test('page heading is visible', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).locator('h1').textContent()).toContain('Showcase');
  });
});

test.describe('Process button (LocatorRace demo)', () => {
  test('process button is visible', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).locator('#process-btn').isVisible()).toBe(true);
  });

  test('clicking process shows loading spinner', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#process-btn').click();
    syncPage.waitForSelector('#loading-spinner', { state: 'visible' });
    expect(syncPage.locator('#loading-spinner').isVisible()).toBe(true);
  });
});

test.describe('Strict race failure demo', () => {
  test('strict race failure shows both outcomes', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#process-strict-fail-btn').click();
    expect(syncPage.locator('#success-message').isVisible()).toBe(true);
    expect(syncPage.locator('#error-dialog').isVisible()).toBe(true);
  });

  test('OK button dismisses outcome', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#process-strict-fail-btn').click();
    syncPage.locator('.ok-btn').click();
    expect(syncPage.locator('#success-message').isHidden()).toBe(true);
  });

  test('Close button dismisses outcome', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#process-strict-fail-btn').click();
    syncPage.locator('.close-btn').click();
    expect(syncPage.locator('#error-dialog').isHidden()).toBe(true);
  });
});

test.describe('API Locator demo', () => {
  test('fetch user button is visible', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).locator('#fetch-user-btn').isVisible()).toBe(true);
  });

  test('fetching user data shows welcome message', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#fetch-user-btn').click();
    syncPage.waitForSelector('#user-message', { state: 'visible' });
    expect(syncPage.locator('#user-message').isVisible()).toBe(true);
  });

  test('fetching product data shows product name', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#fetch-product-btn').click();
    expect(syncPage.locator('#product-message h3').textContent()).toContain('Widget X');
  });

  test('fetching status shows status text', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#fetch-status-btn').click();
    expect(syncPage.locator('#status-message h3').textContent()).toContain('ACTIVE');
  });
});

test.describe('Element events demo', () => {
  test('item list starts empty', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).locator('#item-list li').count()).toBe(0);
  });

  test('adding item creates a list element', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#add-item-btn').click();
    expect(syncPage.locator('#item-list li').count()).toBe(1);
  });

  test('added item has correct text', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#add-item-btn').click();
    expect(syncPage.locator('#item-list li').first().textContent()).toBe('New Item');
  });

  test('modifying item changes text', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#add-item-btn').click();
    syncPage.locator('#modify-item-btn').click();
    expect(syncPage.locator('#item-list li').first().textContent()).toBe('Modified Item');
  });

  test('deleting item removes element', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#add-item-btn').click();
    syncPage.locator('#delete-item-btn').click();
    expect(syncPage.locator('#item-list li').count()).toBe(0);
  });

  test('adding multiple items works', ({ syncPage }) => {
    syncPage.goto(BASE_URL);
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#add-item-btn').click();
    expect(syncPage.locator('#item-list li').count()).toBe(3);
  });

  test('last item can be modified', ({ syncPage }) => {
    syncPage.goto(BASE_URL);
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#modify-item-btn').click();
    expect(syncPage.locator('#item-list li').last().textContent()).toBe('Modified Item');
  });

  test('last item can be deleted', ({ syncPage }) => {
    syncPage.goto(BASE_URL);
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#add-item-btn').click();
    syncPage.locator('#delete-item-btn').click();
    expect(syncPage.locator('#item-list li').count()).toBe(1);
  });
});

test.describe('Interceptors demo', () => {
  test('trigger console error button changes text', ({ syncPage }) => {
    syncPage.goto(BASE_URL)
      .locator('#trigger-console-err').click();
    expect(syncPage.locator('#trigger-console-err').textContent()).toBe('Console Failed');
  });
});

test.describe('Method chaining', () => {
  test('chain: setContent and read heading', ({ syncPage }) => {
    expect(syncPage.setContent('<h1>Sync Test</h1>')
      .locator('h1').textContent()).toBe('Sync Test');
  });

  test('chain: fill and read value', ({ syncPage }) => {
    expect(syncPage.setContent('<input id="sync-input">')
      .locator('#sync-input').fill('hello sync').inputValue()).toBe('hello sync');
  });

  test('chain: check and verify state', ({ syncPage }) => {
    expect(syncPage.setContent('<input type="checkbox" id="sync-cb">')
      .locator('#sync-cb').check().isChecked()).toBe(true);
  });

  test('chain: clear and verify empty', ({ syncPage }) => {
    expect(syncPage.setContent('<input id="sync-clear" value="initial">')
      .locator('#sync-clear').clear().inputValue()).toBe('');
  });

  test('chain: click button and read text', ({ syncPage }) => {
    expect(syncPage.setContent('<button id="sync-btn" onclick="this.textContent=\'Clicked\'">Click Me</button>')
      .locator('#sync-btn').click().textContent()).toBe('Clicked');
  });

  test('chain: setContent, evaluate returns value', ({ syncPage }) => {
    expect(syncPage.setContent('<div id="eval-test">test</div>')
      .evaluate('document.getElementById("eval-test").textContent')).toBe('test');
  });

  test('chain: getByRole returns locator', ({ syncPage }) => {
    expect(syncPage.setContent('<button>Role Button</button>')
      .getByRole('button').isVisible()).toBe(true);
  });

  test('chain: getByText returns locator', ({ syncPage }) => {
    expect(syncPage.setContent('<p>Find Me By Text</p>')
      .getByText('Find Me By Text').isVisible()).toBe(true);
  });

  test('chain: locator filter works', ({ syncPage }) => {
    expect(syncPage.setContent('<ul><li class="a">one</li><li class="b">two</li></ul>')
      .locator('li').filter({ hasText: 'one' }).count()).toBe(1);
  });

  test('chain: fill, clear, fill again, read value', ({ syncPage }) => {
    expect(syncPage.setContent('<input id="x">')
      .locator('#x').fill('hello').clear().fill('world').inputValue()).toBe('world');
  });

  test('chain: check then uncheck then verify', ({ syncPage }) => {
    expect(syncPage.setContent('<input type="checkbox" id="c">')
      .locator('#c').check().uncheck().isChecked()).toBe(false);
  });

  test('chain: hover then click then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<button id="b" onmouseover="this.textContent=\'Hovered\'" onclick="this.textContent=\'Done\'">Start</button>')
      .locator('#b').hover().click().textContent()).toBe('Done');
  });

  test('chain: locator within locator', ({ syncPage }) => {
    expect(syncPage.setContent('<div id="outer"><span id="inner">deep</span></div>')
      .locator('#outer').locator('#inner').textContent()).toBe('deep');
  });

  test('chain: first then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<ul><li>alpha</li><li>beta</li></ul>')
      .locator('li').first().textContent()).toBe('alpha');
  });

  test('chain: last then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<ul><li>alpha</li><li>beta</li></ul>')
      .locator('li').last().textContent()).toBe('beta');
  });

  test('chain: nth then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<ul><li>zero</li><li>one</li><li>two</li></ul>')
      .locator('li').nth(1).textContent()).toBe('one');
  });

  test('chain: dblclick then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<button id="d" ondblclick="this.textContent=\'Double\'">Single</button>')
      .locator('#d').dblclick().textContent()).toBe('Double');
  });

  test('chain: focus then click then read text', ({ syncPage }) => {
    expect(syncPage.setContent('<button id="f" onclick="this.textContent=\'Clicked\'">Idle</button>')
      .locator('#f').focus().click().textContent()).toBe('Clicked');
  });

  test('chain: type and read value', ({ syncPage }) => {
    expect(syncPage.setContent('<input id="t">')
      .locator('#t').type('hello').inputValue()).toBe('hello');
  });

  test('chain: fill then press End then press a then read', ({ syncPage }) => {
    expect(syncPage.setContent('<input id="p" value="ab">')
      .locator('#p').press('End').press('a').inputValue()).toBe('aba');
  });
});

test.describe('Navigation', () => {
  test('page.url returns correct URL', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).url()).toMatch(/^http:\/\/localhost:8300/);
  });

  test('page.content returns HTML', ({ syncPage }) => {
    expect(syncPage.goto(BASE_URL).content()).toContain('Showcase');
  });

  test('page.screenshot does not throw', ({ syncPage }) => {
    syncPage.goto(BASE_URL);
    expect(() => syncPage.screenshot()).not.toThrow();
  });
});
