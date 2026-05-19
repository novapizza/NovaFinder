import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Electron tests must run serially — they share a single user-data dir
  // per app launch, and parallel runs would collide on temp HOME / config.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
})
