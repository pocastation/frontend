import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`관리자 결제 조회, 판매자 정산 및 파일 다운로드 (${width}px)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 850 });
    const seller = { sellerName: "테스트 판매자", sellerId: "8b10c0fd-4b27-4480-b606-c1da3d765fe5" };
    const payment = { ...seller, orderId: 103, title: "테스트 포토카드", paidAt: "2026-11-18T23:00:00Z",
      chargeAmount: 10200, expectedAmount: 0, phase: { status: "보류", reason: "반품·분쟁 진행 중" } };
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      let data: unknown = {};
      if (url.pathname === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
      if (url.pathname === "/api/members/me") data = { id: "staff", nickname: "담당자", role: "ADMIN", emailVerified: true };
      if (url.pathname === "/api/admin/payments") {
        const first = url.searchParams.get("page") === "0";
        data = { content: first ? [payment] : [], hasNext: first };
      }
      if (url.pathname === "/api/admin/payments/sellers") {
        data = { content: [{ ...seller, paymentCount: 2, expectedAmount: 18500, heldAmount: 9700, settledAmount: 0 }], hasNext: false };
      }
      if (url.pathname === "/api/admin/payments/export") {
        expect(route.request().headers().authorization).toBe("Bearer staff-test");
        return route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: "test-file" });
      }
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/admin/settlement");
    await expect(page.getByRole("table", { name: "결제 목록" })).toContainText("반품·분쟁 진행 중");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath("payments.png") });
    await page.getByRole("button", { name: "다음", exact: true }).click();
    await expect(page.getByText("조회할 내역이 없습니다.")).toBeVisible();
    await page.getByRole("button", { name: "판매자별 정산" }).click();
    await expect(page.getByRole("table", { name: "판매자별 정산" })).toContainText("18,500");
    await page.screenshot({ path: info.outputPath("sellers.png") });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "전체 엑셀 다운로드" }).click();
    expect((await download).suggestedFilename()).toBe("결제·정산.xlsx");
  });
}
