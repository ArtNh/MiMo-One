/// <reference types="vitest/browser" />
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    // Enable browser mode with Playwright provider
    browser: {
      enabled: true,
      provider: playwright(),
      // Use Chromium for now; can add others later
      instances: [{ browser: 'chromium' }],
    },
    // Global test options
    globals: true,
    environment: 'jsdom',
    // Exclude vendor and node_modules test directories
    exclude: ['**/src/vendor/**', '**/node_modules/**'],
    // Include only project test files
    include: ['src/**/*.test.{ts,tsx}'],
    // Show UI of the browser when running tests (optional)
    // uncomment the following line to see the browser window
    // browser: { provider: playwright({ headless: false }) },
  },
});
