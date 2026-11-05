import { test, expect, type BrowserContext, type Route } from "@playwright/test";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function mockApi(context: BrowserContext, refreshHandler: (route: Route) => Promise<void>) {
  await context.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") return refreshHandler(route);
    if (path === "/api/members/me") return route.fulfill({ json: {
      success: true, data: { id: "review-user", nickname: "세션테스트", role: "USER", email: "test@example.invalid" },
    } });
    if (path === "/api/notifications/unread-count") return route.fulfill({ json: { success: true, data: { count: 0 } } });
    return route.fulfill({ json: { success: true, data: [] } });
  });
}

async function ok(route: Route) {
  await route.fulfill({
    headers: { "set-cookie": "refreshToken=test-successor; HttpOnly; Path=/api/auth; SameSite=Lax" },
    json: { success: true, data: { accessToken: "test-access", expiresInSeconds: 900 } },
  });
}

test("동시 탭 갱신을 직렬화하고 토큰을 저장소에 쓰지 않는다", async ({ context }) => {
  const first = deferred();
  let calls = 0, active = 0, maximum = 0;
  await mockApi(context, async (route) => {
    calls++; active++; maximum = Math.max(maximum, active);
    if (calls === 1) await first.promise;
    await ok(route);
    active--;
  });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/terms");
  await expect.poll(() => calls).toBe(1);
  await b.goto("/terms");
  await expect.poll(() => b.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBeGreaterThan(0);
  expect(calls).toBe(1);
  first.resolve();
  await expect.poll(() => calls).toBe(2);
  await expect(a.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  await expect(b.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(maximum).toBe(1);
  const storage = await a.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }));
  expect(JSON.stringify(storage)).not.toContain("test-successor");
  expect(JSON.stringify(storage)).not.toContain("test-access");
  expect((await context.cookies()).find((c) => c.name === "refreshToken")?.httpOnly).toBe(true);
});

test("응답 유실은 한 번 재시도하고 같은 탭 갱신을 공유한다", async ({ context, page }) => {
  let calls = 0;
  await mockApi(context, async (route) => {
    calls++;
    if (calls === 1) return route.abort("connectionreset");
    return ok(route);
  });
  await page.goto("/terms");
  await expect(page.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(calls).toBe(2);
});

test("인증 실패는 재시도하지 않는다", async ({ context, page }) => {
  let calls = 0;
  await mockApi(context, async (route) => {
    calls++;
    await route.fulfill({ status: 401, json: { success: false, errorCode: "INVALID_REFRESH_TOKEN", message: "만료" } });
  });
  await page.goto("/terms");
  await expect(page.getByRole("link", { name: "로그인", exact: true }).first()).toBeVisible();
  expect(calls).toBe(1);
});

test("성공 응답 본문 유실도 한 번 재시도한다", async ({ context, page }) => {
  let calls = 0;
  await mockApi(context, async (route) => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":' });
    return ok(route);
  });
  await page.goto("/terms");
  await expect(page.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(calls).toBe(2);
});

test("잠금을 가진 탭을 닫아도 다음 탭이 갱신한다", async ({ context }) => {
  const held = deferred();
  let calls = 0;
  await mockApi(context, async (route) => {
    calls++;
    if (calls === 1) { await held.promise; await route.abort().catch(() => {}); return; }
    await ok(route);
  });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto("/terms");
  await expect.poll(() => calls).toBe(1);
  await b.goto("/terms");
  await expect.poll(() => b.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBeGreaterThan(0);
  await a.close();
  held.resolve();
  await expect(b.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(calls).toBe(2);
});

test("통신 실패 후 잠금을 해제해 다음 탭이 사용할 수 있다", async ({ context }) => {
  let calls = 0;
  await mockApi(context, async (route) => {
    calls++;
    if (calls <= 2) return route.abort("connectionreset");
    return ok(route);
  });
  const a = await context.newPage();
  await a.goto("/terms");
  await expect.poll(() => calls).toBe(2);
  const b = await context.newPage();
  await b.goto("/terms");
  await expect(b.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(calls).toBe(3);
});

test("다른 탭의 갱신 뒤 로그아웃하며 양쪽 로그인 상태가 사라진다", async ({ context }) => {
  const held = deferred();
  let calls = 0, logoutCalls = 0, pending = false;
  await mockApi(context, async (route) => {
    calls++;
    if (calls === 2) { pending = true; await held.promise; pending = false; }
    await ok(route);
  });
  await context.route("**/api/auth/logout", async (route) => {
    expect(pending).toBe(false);
    logoutCalls++;
    await route.fulfill({ headers: { "set-cookie": "refreshToken=; Max-Age=0; Path=/api/auth" }, json: { success: true, data: null } });
  });
  const a = await context.newPage();
  await a.goto("/terms");
  await expect(a.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  const b = await context.newPage();
  await b.goto("/terms");
  await expect.poll(() => pending).toBe(true);
  await a.getByRole("button", { name: "로그아웃", exact: true }).first().click();
  await expect.poll(() => a.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBeGreaterThan(0);
  expect(logoutCalls).toBe(0);
  held.resolve();
  await expect.poll(() => logoutCalls).toBe(1);
  await expect(b.getByRole("link", { name: "로그인", exact: true }).first()).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === "refreshToken")).toBeUndefined();
});

test("Web Locks 미지원 환경도 갱신한다", async ({ context, page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
  let calls = 0;
  await mockApi(context, async (route) => { calls++; await ok(route); });
  await page.goto("/terms");
  await expect(page.getByRole("button", { name: "로그아웃", exact: true }).first()).toBeVisible();
  expect(calls).toBe(1);
});
