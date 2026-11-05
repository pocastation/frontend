import { expect, test } from "@playwright/test";

test("이미지 최적화가 임의 외부 URL을 거절한다", async ({ request }) => {
  const response = await request.get("/_next/image", {
    params: { url: "https://example.com/security-check.png", w: "640", q: "75" },
  });
  expect(response.status()).toBe(400);
});

test("공개 화면의 보안 헤더와 익명 접근을 유지한다", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({
    status: 401, contentType: "application/json", body: "{}",
  }));
  const response = await page.goto("/terms");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.locator("body")).toContainText("이용약관");
});
