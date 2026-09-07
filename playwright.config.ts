import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3588",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3588",
    url: "http://127.0.0.1:3588/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      NEXT_PUBLIC_PORTONE_STORE_ID: "store-test-totp",
      NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY: "channel-test-totp",
      NEXT_PUBLIC_API_URL: "",
    },
  },
});
