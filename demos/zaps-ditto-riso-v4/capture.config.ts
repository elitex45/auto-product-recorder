import { defineConfig, devices } from "@playwright/test";

// Still captures for the studio film: element screenshots at 2x, not a screencast.
export default defineConfig({
  testDir: ".",
  testMatch: "*.capture.ts",
  workers: 1,
  retries: 0,
  timeout: 5 * 60_000,
  use: { ...devices["Desktop Chrome"], video: "off" },
});
