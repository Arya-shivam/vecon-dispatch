import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3107",
    launchOptions: {
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    },
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npm run start -- --port 3107",
    url: "http://127.0.0.1:3107",
    reuseExistingServer: false,
    env: { DEMO_MODE: "true", E2E_TEST: "true" },
  },
});
