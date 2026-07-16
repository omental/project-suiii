import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/real-sync.spec.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "node tests/fixtures/mock-api.mjs",
      url: "http://127.0.0.1:8100/api/v1/__test/state",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        API_INTERNAL_BASE_URL: "http://127.0.0.1:8100/api/v1",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8100/api/v1"
      }
    }
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
