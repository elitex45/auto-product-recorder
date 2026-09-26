import { defineConfig, devices } from "@playwright/test";

// Recording runs, not tests: one worker (parallel workers fight for CPU and drop frames),
// no retries, no Playwright video (the Recorder captures frames itself).
export default defineConfig({
  testDir: "demos",
  testMatch: "**/record.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  use: {
    ...devices["Desktop Chrome"], // the CDP screencast only exists in Chromium
    baseURL: process.env.BASE_URL,
    video: "off",
    // App behind HTTP Basic Auth? Set BASIC_AUTH_USER / BASIC_AUTH_PASSWORD. Never hard-code them.
    httpCredentials: process.env.BASIC_AUTH_USER
      ? { username: process.env.BASIC_AUTH_USER, password: process.env.BASIC_AUTH_PASSWORD ?? "" }
      : undefined,
  },
});
