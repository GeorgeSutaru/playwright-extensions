import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['tests/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    sequence: {
      concurrent: false,
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
