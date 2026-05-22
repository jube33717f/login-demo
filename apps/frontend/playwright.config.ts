import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: [path.resolve(dirname, '.env'), path.resolve(dirname, '.env.local')],
});

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
