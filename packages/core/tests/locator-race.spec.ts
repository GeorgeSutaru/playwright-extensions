import { test, expect } from './race-locator-fixture';

test.describe('page.raceLocator()', () => {
  test('first visible locator wins', async ({ page }) => {
    await page.setContent(`
      <button id="a" style="display:none">Hidden</button>
      <button id="b">Visible</button>
    `);
    const winner = await page.raceLocator([
      page.locator('#a'),
      page.locator('#b'),
    ]);
    expect(await winner.textContent()).toBe('Visible');
  });

  test('skips hidden locators', async ({ page }) => {
    await page.setContent(`
      <button id="a" style="display:none">Hidden</button>
      <button id="b">Visible</button>
    `);
    const winner = await page.raceLocator([
      page.locator('#a'),
      page.locator('#b'),
    ]);
    expect(await winner.textContent()).toBe('Visible');
  });

  test('throws when no locators visible within timeout', async ({ page }) => {
    await page.setContent(`
      <button id="a" style="display:none">Hidden</button>
    `);
    const start = Date.now();
    await expect(
      page.raceLocator([page.locator('#a')], { timeout: 500 }),
    ).rejects.toThrow();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('throws strict mode violation when multiple visible', async ({ page }) => {
    await page.setContent(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `);
    await expect(
      page.raceLocator([
        page.locator('#first'),
        page.locator('#second'),
      ]),
    ).rejects.toThrow('Strict mode violation');
  });

  test('throws when empty array', async ({ page }) => {
    await expect(page.raceLocator([])).rejects.toThrow('No locators');
  });

  test('wins when first locator appears during wait', async ({ page }) => {
    await page.setContent(`
      <div id="container"></div>
    `);

    // Make #a visible after a delay
    setTimeout(async () => {
      await page.locator('#container').evaluate((el: any) => {
        el.innerHTML = '<button id="a">A</button>';
      });
    }, 150);

    const winner = await page.raceLocator([
      page.locator('#a'),
      page.locator('#b'),
    ], { timeout: 3000 });
    expect(await winner.textContent()).toBe('A');
  });

  test('returns winner that can be used for actions', async ({ page }) => {
    await page.setContent(`
      <button id="win">Click me</button>
    `);
    const winner = await page.raceLocator([
      page.locator('#win'),
      page.locator('#lose'),
    ]);
    await winner.click();
    await expect(page.locator('#win')).toBeVisible();
  });

  test('single visible locator wins immediately', async ({ page }) => {
    await page.setContent(`
      <div id="only">Only one</div>
    `);
    const winner = await page.raceLocator([
      page.locator('#only'),
      page.locator('#missing'),
    ]);
    expect(await winner.textContent()).toBe('Only one');
  });

  test('waits for element to appear', async ({ page }) => {
    await page.setContent(`
      <div id="container"></div>
    `);
    
    // Element will appear after 150ms
    setTimeout(async () => {
      await page.locator('#container').evaluate((el: any) => {
        el.innerHTML = '<button id="appeared">Appeared</button>';
      });
    }, 150);

    const winner = await page.raceLocator([page.locator('#appeared')], {
      timeout: 3000,
    });
    expect(await winner.textContent()).toBe('Appeared');
  });

  test('works with getByRole', async ({ page }) => {
    await page.setContent(`
      <button role="button" id="btn">Submit</button>
    `);
    const winner = await page.raceLocator([page.locator('button')]);
    expect(await winner.textContent()).toBe('Submit');
  });

  test('strict mode includes selector names in error', async ({ page }) => {
    await page.setContent(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `);
    try {
      await page.raceLocator([
        page.locator('#first'),
        page.locator('#second'),
      ]);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('#first');
      expect(err.message).toContain('#second');
    }
  });

  test('timeout option works', async ({ page }) => {
    await page.setContent(`
      <div id="none" style="display:none">None</div>
    `);
    const start = Date.now();
    await expect(
      page.raceLocator([page.locator('#none')], { timeout: 200 }),
    ).rejects.toThrow();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test('three locators, middle one visible', async ({ page }) => {
    await page.setContent(`
      <button id="a" style="display:none">A</button>
      <button id="b">B</button>
      <button id="c" style="display:none">C</button>
    `);
    const winner = await page.raceLocator([
      page.locator('#a'),
      page.locator('#b'),
      page.locator('#c'),
    ]);
    expect(await winner.textContent()).toBe('B');
  });

  test('uses or() chaining correctly', async ({ page }) => {
    await page.setContent(`
      <div class="container" style="display:none"><span>Container</span></div>
      <button id="btn">Click</button>
    `);
    const winner = await page.raceLocator([
      page.locator('#nonexistent'),
      page.locator('.container'),
      page.locator('#btn'),
    ]);
    expect(await winner.textContent()).toBe('Click');
  });

  test('single locator passes through', async ({ page }) => {
    await page.setContent(`
      <input id="input" />
    `);
    const winner = await page.raceLocator([page.locator('#input')]);
    await winner.fill('test');
    expect(await page.locator('#input').inputValue()).toBe('test');
  });

  test.describe('visibilityMode', () => {
    test('default mode waits for visible in viewport', async ({ page }) => {
      await page.setContent(`
        <div style="height: 2000px"></div>
        <button id="btn" style="position: absolute; top: 2100px; display: none;">Button</button>
      `);
      const start = Date.now();
      await expect(
        page.raceLocator([page.locator('#btn')], { timeout: 300 }),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    test('visible mode matches element not in viewport but rendered', async ({ page }) => {
      await page.setContent(`
        <div style="height: 2000px"></div>
        <button id="btn" style="position: absolute; top: 2100px;">Off Screen</button>
      `);
      const winner = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'visible',
      });
      expect(await winner.textContent()).toBe('Off Screen');
    });

    test('visible mode still rejects display:none elements', async ({ page }) => {
      await page.setContent(`
        <button id="btn" style="display:none">Hidden</button>
      `);
      const start = Date.now();
      await expect(
        page.raceLocator([page.locator('#btn')], {
          visibilityMode: 'visible',
          timeout: 300,
        }),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    test('presence mode matches element in DOM regardless of visibility', async ({ page }) => {
      await page.setContent(`
        <button id="btn" style="display:none">Hidden</button>
      `);
      const winner = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'presence',
      });
      expect(await winner.textContent()).toBe('Hidden');
    });

    test('presence mode matches removed element as not present', async ({ page }) => {
      await page.setContent(`
        <div id="container"></div>
      `);
      const start = Date.now();
      await expect(
        page.raceLocator([page.locator('#missing')], {
          visibilityMode: 'presence',
          timeout: 300,
        }),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    test('presence mode wins when element appears in DOM', async ({ page }) => {
      await page.setContent(`
        <div id="container"></div>
      `);
      setTimeout(async () => {
        await page.locator('#container').evaluate((el: any) => {
          el.innerHTML = '<button id="appeared" style="display:none">Appeared</button>';
        });
      }, 150);
      const winner = await page.raceLocator([page.locator('#appeared')], {
        visibilityMode: 'presence',
        timeout: 3000,
      });
      expect(await winner.textContent()).toBe('Appeared');
    });

    test('default mode vs presence mode - hidden element', async ({ page }) => {
      await page.setContent(`
        <button id="btn" style="display:none">Hidden</button>
      `);
      const startDefault = Date.now();
      await expect(
        page.raceLocator([page.locator('#btn')], {
          visibilityMode: 'default',
          timeout: 200,
        }),
      ).rejects.toThrow();
      const defaultElapsed = Date.now() - startDefault;
      expect(defaultElapsed).toBeLessThan(800);

      const winner = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'presence',
      });
      expect(await winner.textContent()).toBe('Hidden');
    });

    test('visible mode vs presence mode - off-screen element', async ({ page }) => {
      await page.setContent(`
        <div style="height: 2000px"></div>
        <button id="btn" style="position: absolute; top: 2100px;">Off Screen</button>
      `);
      const winnerVisible = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'visible',
      });
      expect(await winnerVisible.textContent()).toBe('Off Screen');

      const winnerPresence = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'presence',
      });
      expect(await winnerPresence.textContent()).toBe('Off Screen');
    });

    test('visibilityMode with multiple locators - presence throws strict violation', async ({ page }) => {
      await page.setContent(`
        <button id="a" style="display:none">Hidden A</button>
        <button id="b" style="display:none">Hidden B</button>
      `);
      await expect(
        page.raceLocator([page.locator('#a'), page.locator('#b')], {
          visibilityMode: 'presence',
        }),
      ).rejects.toThrow('Strict mode violation');
    });

    test('visibilityMode with multiple locators - visible picks rendered one', async ({ page }) => {
      await page.setContent(`
        <div style="height: 2000px"></div>
        <button id="a" style="position: absolute; top: 2100px; display:none">Hidden A</button>
        <button id="b" style="position: absolute; top: 2100px;">Visible B</button>
      `);
      const winner = await page.raceLocator([
        page.locator('#a'),
        page.locator('#b'),
      ], {
        visibilityMode: 'visible',
      });
      expect(await winner.textContent()).toBe('Visible B');
    });

    test('explicit default mode behaves same as no mode', async ({ page }) => {
      await page.setContent(`
        <button id="a" style="display:none">Hidden</button>
        <button id="b">Visible</button>
      `);
      const winner = await page.raceLocator([
        page.locator('#a'),
        page.locator('#b'),
      ], {
        visibilityMode: 'default',
      });
      expect(await winner.textContent()).toBe('Visible');
    });

    test('presence mode with dynamically removed element', async ({ page }) => {
      await page.setContent(`
        <button id="btn">Remove me</button>
      `);
      const winner = await page.raceLocator([page.locator('#btn')], {
        visibilityMode: 'presence',
      });
      expect(await winner.textContent()).toBe('Remove me');

      await page.locator('#btn').evaluate((el: any) => el.remove());

      const start = Date.now();
      await expect(
        page.raceLocator([page.locator('#btn')], {
          visibilityMode: 'presence',
          timeout: 300,
        }),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
