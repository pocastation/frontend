import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// 사용자 Chrome 프로필 대신 Playwright가 관리하는 격리된 브라우저 사용.
export default defineConfig(base, {
  testMatch: "session-refresh.spec.ts",
  use: { channel: undefined },
});
