import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "desktop-online.spec.ts",
  outputDir: "test-results-desktop-online",
  timeout: 30000,
  workers: 1,
  reporter: "list",
});
