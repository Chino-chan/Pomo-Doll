import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.mjs'],
    testTimeout: 10000,
  },
});
