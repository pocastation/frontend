import { expect, test } from "@playwright/test";

test("발송 대기 중인 예약만 확인 후 취소하고 새로고침해도 취소 기록을 유지한다", async ({ page }) => {
  const api = "/api/admin/notification-campaigns";
  const scheduledAt = "2099-12-31T00:00:00Z";
  const history = [1, 2, 3].map(id => ({
    id, title: `행사 ${id}`, targetName: "전체 회원", marketing: true, scheduledAt,
    sentAt: id === 3 ? scheduledAt : null, cancelledAt: null as string | null, recipients: 0, opened: 0,
  }));
  let cancelRequests = 0;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
    if (path === "/api/members/me") data = { id: "staff", nickname: "담당자", role: "ADMIN", emailVerified: true };
    if (path === api) data = history;
    if (path === api + "/1/cancel" && route.request().method() === "POST") {
      cancelRequests++;
      history[0].cancelledAt = "2026-11-19T08:30:00Z";
      data = { cancelledAt: history[0].cancelledAt };
    }
    if (path === api + "/2/cancel" && route.request().method() === "POST") {
      history[1].sentAt = scheduledAt;
      return route.fulfill({ status: 409, json: { success: false, message: "이미 발송된 알림은 예약을 취소할 수 없어요." } });
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/notifications");
  const row = (title: string) => page.getByRole("listitem").filter({ hasText: title });
  const cancel = row("행사 1").getByRole("button", { name: "예약 취소" });
  await expect(page.getByRole("button", { name: "예약 취소" })).toHaveCount(2);
  page.once("dialog", dialog => dialog.dismiss());
  await cancel.click();
  expect(cancelRequests).toBe(0);
  page.once("dialog", dialog => dialog.accept());
  await cancel.click();
  await expect(row("행사 1")).toContainText("예약 취소됨");
  expect(cancelRequests).toBe(1);
  await page.reload();
  await expect(row("행사 1")).toContainText("예약 취소됨");
  await expect(cancel).toHaveCount(0);
  page.once("dialog", dialog => dialog.accept());
  await row("행사 2").getByRole("button", { name: "예약 취소" }).click();
  await expect(page.getByText("이미 발송된 알림은 예약을 취소할 수 없어요.")).toBeVisible();
  await expect(row("행사 2")).toContainText("인앱 발송");
  await expect(page.getByRole("button", { name: "예약 취소" })).toHaveCount(0);
});

test("알림함과 푸시 상세 주소에서 같은 캠페인 본문을 연다", async ({ page }) => {
  let opens = 0;
  const detail = "/notifications/campaigns/37";
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === "/api/auth/refresh") data = { accessToken: "member-test", expiresInSeconds: 900 };
    if (path === "/api/members/me") data = { id: "reader", nickname: "독자", role: "USER" };
    if (path.endsWith("/unread-count")) data = { count: 1 };
    if (path === "/api/members/me/notifications") data = {
      page: 0, totalPages: 1, content: [{ id: 80, type: "CAMPAIGN", campaignId: 37, isRead: false,
        title: "주말 행사", message: "현장 안내", createdAt: "2026-11-19T01:00:00Z" }],
    };
    if (path === "/api/notification-campaigns/37/open" && route.request().method() === "POST") {
      opens++;
      data = { title: "주말 행사", message: "현장 안내", photoUrls: ["/media/photos/test_display.jpg"] };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/notifications");
  const item = page.getByRole("button", { name: /주말 행사/ });
  await expect(item).toBeVisible();
  expect(opens).toBe(0);
  await item.click();
  await expect(page).toHaveURL(new RegExp(detail + "$"), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "주말 행사" })).toBeVisible();
  const firstOpen = opens;
  await page.goto(detail);
  await expect(page.getByText("현장 안내")).toBeVisible();
  await expect(page.getByRole("img", { name: "알림 첨부 사진 1" })).toHaveAttribute("src", /test_display\.jpg$/);
  expect(opens).toBeGreaterThan(firstOpen);
});

for (const width of [390, 1280]) {
  test(`대상 변경 후 수신 인원을 다시 확인하고 예약 발송 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const api = "/api/admin/notification-campaigns";
    const requests: { audience: { kind: string; targetId: number; marketing: boolean }; scheduledAt: string }[] = [];
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = {};
      if (path === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
      if (path === "/api/members/me") data = { id: "staff", nickname: "담당자", role: "ADMIN", emailVerified: true };
      if (path === api) {
        if (route.request().method() === "POST") requests.push(route.request().postDataJSON());
        data = route.request().method() === "POST" ? { id: 1 } : [];
      }
      if (path === api + "/targets") data = [{ id: 7, name: "테스트 아티스트" }];
      if (path === "/api/artists/7/idols") data = { content: [
        { membershipId: 35, idolId: 13, stageName: "진", active: true },
        { membershipId: 36, idolId: 14, stageName: "정국", active: true },
      ] };
      if (path === "/api/media/images") data = { url: "/media/photos/test.jpg", thumbnailUrl: "/media/photos/test_thumb.jpg" };
      if (path === api + "/preview") {
        const audience = route.request().postDataJSON();
        const counts: Record<string, number> = { ALL: 10, ARTIST: 2, ARTIST_MEMBERS: audience.membershipIds?.length };
        data = { count: counts[audience.kind] };
      }
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/admin/notifications");
    await page.getByLabel("제목", { exact: true }).fill("행사 안내");
    await page.getByLabel("내용", { exact: true }).fill("테스트 본문");
    await page.getByRole("button", { name: "수신 인원 확인" }).click();
    await expect(page.getByText("예상 수신 회원 10명")).toBeVisible();
    await page.getByLabel("발송 대상").selectOption("ARTIST");
    await expect(page.getByText("예상 수신 회원 10명")).toHaveCount(0);
    await page.getByLabel("검색 결과").selectOption("7");
    await page.getByLabel("발송 시점").selectOption("later");
    await page.getByLabel("예약 일시").fill("2099-12-31T09:30");
    await page.getByRole("button", { name: "수신 인원 확인" }).click();
    await expect(page.getByText("예상 수신 회원 2명")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "그룹 전체" })).toBeChecked();
    await page.getByRole("checkbox", { name: "진", exact: true }).check();
    await expect(page.getByText("예상 수신 회원 2명")).toHaveCount(0);
    await page.getByRole("button", { name: "수신 인원 확인" }).click();
    await expect(page.getByText("예상 수신 회원 1명")).toBeVisible();
    await page.getByRole("checkbox", { name: "정국" }).check();
    await expect(page.getByRole("checkbox", { name: "진", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "그룹 전체" })).not.toBeChecked();
    await page.getByLabel("사진 추가").setInputFiles({ name: "notice.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WioAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: "수신 인원 확인" }).click();
    await expect(page.getByText("예상 수신 회원 2명")).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.getByRole("button", { name: "예약 확정" }).click();
    await expect(page.getByText("발송 요청을 등록했어요.")).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      audience: { kind: "ARTIST_MEMBERS", targetId: 7, membershipIds: [35, 36], marketing: true },
      scheduledAt: "2099-12-31T00:30:00.000Z", photoUrls: ["/media/photos/test.jpg"],
    });
  });
}
