import { expect, test, type Page } from "@playwright/test";

/** 행사 종료까지 만남 확인이 없으면 양쪽에 자동으로 걸리는 노쇼 신고(backend#649). */

const HOUR = 60 * 60 * 1000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

const item = { artistId: 1, artistName: "아이브", idolId: 1, idolName: "장원영", source: "BROADCAST", grade: "A" };

function report(overrides: Record<string, unknown>) {
  return {
    id: 1,
    status: "PENDING",
    reportedAt: iso(-HOUR),
    explainUntil: iso(23 * HOUR),
    explanation: null,
    resolvedAt: null,
    autoFiled: true,
    ...overrides,
  };
}

function thread(meetup: Record<string, unknown>, noShow: Record<string, unknown> | null) {
  return {
    id: 1,
    postId: 1,
    counterpartNickname: "포카러",
    place: "상암 MBC 1번 출구 앞",
    slot: { id: 1, fromMinuteOfDay: 1140, toMinuteOfDay: 1200 },
    writable: true,
    lockedAt: iso(72 * HOUR),
    offer: item,
    offerPhotoUrl: null,
    completion: { confirmed: false, confirmedByMe: false, disputed: false, confirmedAt: null },
    appearance: { writable: true, mine: null, counterpart: null },
    meetup: {
      codeHolder: false,
      opensAt: iso(-2 * HOUR),
      closesAt: iso(-HOUR / 2),
      open: false,
      confirmed: false,
      confirmedAt: null,
      lockedUntil: null,
      ...meetup,
    },
    noShow,
    messages: [],
  };
}

async function mockApi(page: Page, data: () => unknown) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path === "/api/auth/refresh") body = { accessToken: "member-test", expiresInSeconds: 900 };
    if (path === "/api/members/me") body = { id: "me", nickname: "나", role: "USER", emailVerified: true };
    if (path === "/api/exchanges/1/thread") body = data();
    if (path === "/api/exchanges/1") body = { id: 1, have: item, photos: [], viewer: { author: false } };
    if (path === "/api/admin/exchange-no-shows") body = data();
    return route.fulfill({ json: { success: true, data: body } });
  });
}

test("행사 전에는 마감 시각과 자동 신고를 미리 알린다", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mockApi(page, () => thread({ opensAt: iso(-HOUR), closesAt: iso(2 * HOUR), open: true }, { againstMe: null, againstCounterpart: null }));
  await page.goto("/exchanges/1/thread");

  await expect(page.getByText(/까지 확인하지 않으면 두 사람 모두에게 노쇼 신고가 접수돼요/)).toBeVisible();
  await expect(page.getByRole("button", { name: "상대가 안 왔어요" })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("before-close.png"), fullPage: true });
});

test("행사가 끝나 자동 신고가 걸리면 맨 위에서 해명을 받고, 상대 상태도 보여 준다", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let explained = false;
  await mockApi(page, () =>
    thread(
      {},
      {
        againstMe: explained ? report({ status: "DISPUTED", explanation: "만나서 교환했는데 코드를 잊었어요." }) : report({}),
        againstCounterpart: report({ id: 2 }),
      },
    ),
  );
  await page.route("**/api/exchanges/1/no-show/explanation", async (route) => {
    explained = true;
    return route.fulfill({ json: { success: true, data: report({ status: "DISPUTED" }) } });
  });
  await page.goto("/exchanges/1/thread");

  const notice = page.getByRole("region", { name: "행사가 끝날 때까지 만남 확인 코드가 입력되지 않았어요" });
  await expect(notice).toContainText("두 사람 모두에게 노쇼 신고가 접수됐어요.");
  await expect(page.getByText("행사가 끝날 때까지 코드가 확인되지 않아 교환 완료로 기록되지 않았어요.", { exact: false })).toBeVisible();
  await expect(page.getByText("포카러님에 대한 노쇼 신고")).toBeVisible();
  await expect(page.getByText(/포카러님의 해명을 기다려요/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("auto-filed.png"), fullPage: true });

  await page.getByLabel("해명").fill("만나서 교환했는데 코드를 잊었어요.");
  await page.getByRole("button", { name: "해명 보내기" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByText("나에 대한 노쇼 신고")).toBeVisible();
  await expect(page.getByText("내 해명: 만나서 교환했는데 코드를 잊었어요.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("explained.png"), fullPage: true });
});

test("관리자 목록은 자동 신고를 신고자 없이 만남 미확인으로 보여 준다", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path === "/api/auth/refresh") body = { accessToken: "staff-test", expiresInSeconds: 900 };
    if (path === "/api/members/me") body = { id: "staff", nickname: "관리자", role: "ADMIN", emailVerified: true };
    if (path === "/api/admin/exchange-no-shows") {
      body = {
        content: [
          {
            id: 7, postId: 1, place: "상암 MBC 1번 출구 앞",
            reporterId: "a", reporterNickname: "포카러", reportedId: "b", reportedNickname: "교환왕",
            status: "DISPUTED", reportedAt: iso(-HOUR), explainUntil: iso(23 * HOUR),
            explanation: "만나서 교환했는데 코드를 잊었어요.", explainedAt: iso(-HOUR / 2),
            meetAt: iso(-5 * HOUR), meetupConfirmedAt: null, resolvedAt: null, resolvedBy: null, resolutionReason: null,
            autoFiled: true,
          },
        ],
        page: 0, size: 20, totalElements: 1, totalPages: 1,
      };
    }
    return route.fulfill({ json: { success: true, data: body } });
  });
  await page.goto("/admin/exchange-no-shows");

  await expect(page.getByText("교환왕 · 만남 미확인").first()).toBeVisible();
  await expect(page.getByText("포카러 → 교환왕")).toHaveCount(0);
  await page.getByRole("button", { name: "신고 7 상세" }).click();
  await expect(page.getByRole("heading", { name: "교환왕 · 만남 미확인 자동 신고" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("admin.png") });
});
