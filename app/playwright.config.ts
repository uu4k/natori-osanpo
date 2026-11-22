import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/natori-osanpo/',
    locale: 'ja-JP',
    acceptDownloads: true,
  },
  projects: [
    // iPhone 13 相当の画面サイズ（エンジンは Chromium）
    { name: 'iphone-size', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'pixel7', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/natori-osanpo/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
