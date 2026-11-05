import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// 검증 전용 Chromium을 사용해 개인 Chrome 프로필과 분리한다.
export default defineConfig({
  ...base,
  use: { ...base.use, channel: undefined },
});
