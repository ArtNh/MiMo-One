import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/vendor/mimo-code/packages/desktop/**/*.test.ts'],
    setupFiles: ['./vitest.desktop.setup.ts'],
  },
  resolve: {
    alias: {
      'bun:test': 'vitest',
    },
  },
});
