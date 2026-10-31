import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the local Supabase stack (`npm run db:start`) and the
// Vite dev server with the development email sign-in enabled. See README.md.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    env: { VITE_ENABLE_DEV_LOGIN: 'true' },
  },
})
