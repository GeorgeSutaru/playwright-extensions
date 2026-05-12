import { test, expect } from '@playwright/test';

test('expect message', () => {
  const errorMsg = "Error: [Request Error] POST http://localhost:8300/api/fail-included - Status 500";
  expect(errorMsg, errorMsg).toBeNull();
});
