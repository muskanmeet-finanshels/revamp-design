import { defineConfig } from '@playwright/test';
import shared from './playwright.config';

// Reuse the managed workflow. Never spawn a second Next server sharing .next-dev.
export default defineConfig({
  ...shared,
  testMatch: 'pms-assistant.spec.ts',
  outputDir: 'test-results/assistant',
  timeout: 180_000,
  use: {
    ...shared.use,
    baseURL: process.env.PMS_ASSISTANT_BASE_URL || 'http://127.0.0.1:18749',
    viewport: { width: 1280, height: 800 },
    navigationTimeout: 180_000,
    launchOptions: {
      ...shared.use?.launchOptions,
      args: ['--disable-features=OverlayScrollbar,OverlayScrollbars'],
    },
  },
  webServer: undefined,
});