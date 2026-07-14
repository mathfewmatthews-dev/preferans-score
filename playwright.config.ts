import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [
    ["list"],
    ["./tests/e2e/audit/audit-reporter.ts", { outputDir: "audit-results" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});
