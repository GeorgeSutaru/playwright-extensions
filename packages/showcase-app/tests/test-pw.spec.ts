import { test, expect } from '@playwright/test';
test('test proxy constructor', async ({ page }) => {
  const dummy = page.locator('__api_locator_pending__');
  const proxy = new Proxy(dummy, {
    get(target, prop, receiver) {
        if (prop === 'then') return undefined;
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
            return (...args) => value.apply(target, args);
        }
        return value;
    }
  });
  console.log('Constructor name string: ', proxy.constructor.name);
  await expect(proxy).toBeVisible();
});
