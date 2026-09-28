import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const port = 3107;
const replitChromium = '/repl/tools/bin/chromium';

export default defineConfig({
  testDir: './tests',
  testMatch: 'projects-download.spec.ts',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    launchOptions: process.env.CHROMIUM_PATH || existsSync(replitChromium)
      ? { executablePath: process.env.CHROMIUM_PATH || replitChromium }
      : undefined,
  },
  webServer: {
    command: `PORT=${port} pnpm dev`,
    url: `http://127.0.0.1:${port}/projects`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});