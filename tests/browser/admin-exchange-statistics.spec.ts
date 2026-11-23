import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`월 전환과 방송 회차별 교환 통계 (${width}px)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    let empty = false;
    let fail = false;
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      let data: unknown = {};
      if (url.pathname === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
      if (url.pathname === "/api/members/me") data = { id: "staff", nickname: "관리자", role: "ADMIN", emailVerified: true };
      if (url.pathname === "/api/admin/exchange-statistics") {
        if (fail) return route.fulfill({ status: 503, json: { success: false, message: "통계 조회 실패" } });
        const month = url.searchParams.get("month");
        const rows = [
          ["뮤직뱅크", "01", 204, 170, 4], ["뮤직뱅크", "08", 168, 144, 4],
          ["엠카운트다운", "07", 318, 267, 7], ["인기가요", "10", 246, 203, 5],
          ["쇼! 음악중심", "09", 194, 158, 4], ["쇼챔피언", "06", 136, 106, 3], ["더쇼", "05", 118, 92, 2],
        ] as const;
        data = { month, previous: { registered: 1292, completed: 1054, noShows: 37 },
          sessions: empty ? [] : rows.map(([program, day, registered, completed, noShows], i) => ({
            eventId: i+1, type: "MUSIC_SHOW", program, eventDate: month + "-" + day, counts: { registered, completed, noShows },
          })) };
      }
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/admin/exchange-statistics");
    const totals = page.getByRole("region", { name: "월간 교환 합계" });
    await expect(totals).toContainText("1,384");
    await expect(totals).toContainText("1,140");
    await expect(totals).toContainText("전월 대비 -8건");
    await expect(page.getByText("거래 금액")).toHaveCount(0);
    const button = page.getByRole("button", {name:"뮤직뱅크"});
    await expect(button).toHaveAttribute("aria-expanded","false");
    await page.screenshot({ path: info.outputPath("exchange-statistics.png") });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded","true");
    await expect(page.getByRole("table").getByText("204건")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    empty = true;
    await page.getByLabel("조회 월").fill("2020-01");
    await expect(page.getByText("이 달에는 행사 일정이나 교환 기록이 없습니다.")).toBeVisible();
    fail = true;
    await page.getByLabel("조회 월").fill("2020-02");
    await expect(page.getByRole("button",{name:"다시 시도"})).toBeVisible();
    fail = false;
    empty = false;
    await page.getByRole("button",{name:"다시 시도"}).click();
    await expect(totals).toContainText("1,384");
  });
}
