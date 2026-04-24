import { test, expect } from "@playwright/test";

test("sample extension test", async ({ page }) => {
  await page.setContent(`
      <button id="btn1">Hidden</button>
      <button id="btn2">Visible</button>
    `);
  const winner = await page.locator("#btn1").or(page.locator("#btn2")).first().textContent();
  console.log("Winner:", winner);
  expect(winner).toBe("Hidden");
});
