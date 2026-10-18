import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  outputDir: "test-results-desktop",
  testMatch: "desktop.spec.ts",
  timeout: 45000,
  workers: 1,
  reporter: "list",
});
