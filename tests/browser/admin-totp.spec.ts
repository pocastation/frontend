import { test, expect, type Page } from "@playwright/test";

// 외부 PASS와 백엔드만 모의 처리. 실제 로그인 폼·AuthProvider·라우팅·SDK 래퍼를 실행한다.
const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const root = "/api/auth/admin/totp/";
async function setup(page: Page, step = "TOTP_REQUIRED") {
  const state = {
    step,
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    status: 200,
    error: "ADMIN_TOTP_INVALID",
    me: 0,
    refresh: 0,
    verified: false,
    user: false,
    enrollmentCalls: 0,
    enrollError: false,
    challengeError: false,
    posts: [] as { path: string; body: Record<string, string> }[],
  };
  const challenge = () => ({
    challengeToken: "A".repeat(43),
    nextStep: state.step,
    identityVerificationId: "totp-server-request",
    expiresAt: state.expiresAt,
  });
  await page.addInitScript(() => {
    Object.assign(window, {
      __passRequests: [],
      PortOne: {
        requestIdentityVerification: async (
          request: Record<string, string>,
        ) => {
          (
            window as unknown as { __passRequests: unknown[] }
          ).__passRequests.push(request);
          return { identityVerificationId: request.identityVerificationId };
        },
      },
    });
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body =
      request.method() === "POST" ? (request.postDataJSON() ?? {}) : {};
    if (request.method() === "POST") state.posts.push({ path, body });
    const ok = (data: unknown) =>
      route.fulfill({ json: { success: true, data } });
    const fail = (status = 401, errorCode = "ADMIN_TOTP_INVALID") =>
      route.fulfill({
        status,
        json: { success: false, errorCode, message: "인증 실패" },
      });
    if (path === "/api/auth/refresh") {
      state.refresh++;
      return state.verified
        ? ok({ accessToken: "verified-token", expiresInSeconds: 900 })
        : fail();
    }
    if (path === "/api/auth/login") {
      state.user = body.email === "user@example.test";
      state.verified = state.user;
      return ok(
        state.user
          ? { accessToken: "user-token", expiresInSeconds: 900 }
          : { challenge: challenge(), expiresInSeconds: 300 },
      );
    }
    if (path === "/api/members/me") {
      state.me++;
      if (!state.verified) return fail();
      return ok({
        id: "staff-id",
        nickname: "운영 담당자",
        role: state.user ? "USER" : "ADMIN",
        emailVerified: true,
        identityVerified: true,
      });
    }
    if (path === root + "challenge")
      return state.challengeError
        ? fail(401, "ADMIN_TOTP_CHALLENGE_INVALID")
        : ok(challenge());
    if (path === root + "enrollment" || path === root + "recovery") {
      state.enrollmentCalls++;
      if (state.enrollError) return fail(503, "AUTHENTICATION_UNAVAILABLE");
      if (state.status !== 200) return fail(state.status, state.error);
      state.step = "TOTP_ENROLLMENT_REQUIRED";
      return ok({
        challenge: challenge(),
        secret,
        otpauthUri: `otpauth://totp/Pocastation:staff?secret=${secret}&issuer=Pocastation`,
      });
    }
    if (path === root + "verify" || path === root + "enrollment/confirm") {
      if (state.status !== 200) return fail(state.status, state.error);
      state.verified = true;
      return ok({
        accessToken: "verified-token",
        expiresInSeconds: 900,
        ...(path.endsWith("confirm")
          ? {
              recoveryCodes: Array.from(
                { length: 10 },
                (_, i) => `DEMO${i}-` + "b".repeat(37),
              ),
            }
          : {}),
      });
    }
    if (path.includes("count")) return ok({ count: 0, unreadCount: 0 });
    return ok({ content: [], totalElements: 0, totalPages: 0 });
  });
  return state;
}
async function visit(page: Page) {
  await page.goto("/auth/totp?next=%2Ffaq");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("관리자 로그인은 OTP 전에 회원 조회·세션 완료를 하지 않는다", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/login?redirect=%2Ffaq");
  await page
    .getByPlaceholder("이메일", { exact: true })
    .fill("admin@example.test");
  await page
    .getByPlaceholder("비밀번호", { exact: true })
    .fill("ExamplePass123!");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "2차 인증", exact: true }),
  ).toBeVisible();
  expect(state.me).toBe(0);
  await page.getByLabel("인증번호", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "인증하고 로그인" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  expect(state.me).toBe(1);
});

test("일반 회원은 기존 로그인으로 완료", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/login?redirect=%2Ffaq");
  await page
    .getByPlaceholder("이메일", { exact: true })
    .fill("user@example.test");
  await page
    .getByPlaceholder("비밀번호", { exact: true })
    .fill("ExamplePass123!");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/faq$/);
  expect(state.posts.some((p) => p.path.startsWith(root))).toBe(false);
});

test("PASS 최초 등록·로컬 QR·복구 코드 보관까지 연결", async ({ page }) => {
  const state = await setup(page, "PASS_REQUIRED");
  await page.setViewportSize({ width: 360, height: 850 });
  await visit(page);
  await page.getByRole("button", { name: "PASS로 본인인증" }).click();
  await expect(
    page.getByRole("heading", { name: "인증 앱에 계정 추가" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __passRequests: { identityVerificationId: string }[];
          }
        ).__passRequests[0].identityVerificationId,
    ),
  ).toBe("totp-server-request");
  await expect(
    page.locator('section[aria-label="관리자 2차 인증"] svg'),
  ).toBeVisible();
  await page.getByText("같은 휴대폰이라 스캔하기 어렵나요?").click();
  await expect(page.getByText(secret, { exact: true })).toBeVisible();
  await page.getByLabel("인증번호", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "등록 완료", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "복구 코드를 보관해 주세요" }),
  ).toBeVisible();
  expect(state.me).toBe(0);
  await expect(page.locator("section ol li")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "계속하기" })).toBeDisabled();
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  // Next 개발 서버 자체 RSC 디버그 캐시와 제품의 인증 정보 저장을 구분한다.
  expect(
    Object.keys(storage.session).filter(
      (key) => !key.startsWith("__next_debug_channel:"),
    ),
  ).toEqual([]);
  expect(storage.local).toEqual({});
  for (const value of [
    secret,
    "A".repeat(43),
    "verified-token",
    "DEMO0-" + "b".repeat(37),
  ])
    expect(JSON.stringify(storage)).not.toContain(value);
  await page.getByLabel("복구 코드를 안전한 곳에 보관했어요.").check();
  await page.getByRole("button", { name: "계속하기" }).click();
  await expect(page).toHaveURL(/\/faq$/);
});

test("모바일 PASS 리다이렉트는 쿠키 챌린지로 재개하고 쿼리 정리", async ({
  page,
}) => {
  const state = await setup(page, "PASS_REQUIRED");
  await page.goto(
    "/auth/totp?next=%2Ffaq&identityVerificationId=totp-server-request&txId=sample-transaction",
  );
  await expect(
    page.getByRole("heading", { name: "인증 앱에 계정 추가" }),
  ).toBeVisible();
  expect(state.refresh).toBe(0);
  expect(state.enrollmentCalls).toBe(1);
  expect(page.url()).not.toContain("identityVerificationId");
  expect(page.url()).not.toContain("txId");
});

test("PASS 결과 확인 실패 후 이미 끝난 PASS를 다시 열지 않고 재조회", async ({
  page,
}) => {
  const state = await setup(page, "PASS_REQUIRED");
  state.enrollError = true;
  await visit(page);
  await page.getByRole("button", { name: "PASS로 본인인증" }).click();
  await expect(page.locator("section").getByRole("alert")).toContainText(
    "지금은 인증",
  );
  state.enrollError = false;
  await page.getByRole("button", { name: "인증 결과 다시 확인" }).click();
  await expect(
    page.getByRole("heading", { name: "인증 앱에 계정 추가" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __passRequests: unknown[] }).__passRequests
          .length,
    ),
  ).toBe(1);
});

test("복구 코드는 새 인증 앱 등록으로만 연결", async ({ page }) => {
  const state = await setup(page);
  await visit(page);
  await page
    .getByRole("button", { name: "인증 앱을 사용할 수 없나요?" })
    .click();
  await expect(page.getByText(/모든 기기에서 로그아웃/)).toBeVisible();
  await page.getByRole("button", { name: "복구 코드로 확인" }).click();
  await page
    .getByLabel("복구 코드", { exact: true })
    .fill("test-recovery-code");
  await page.getByRole("button", { name: "확인하고 다시 등록" }).click();
  await expect(
    page.getByRole("heading", { name: "인증 앱에 계정 추가" }),
  ).toBeVisible();
  expect(state.me).toBe(0);
  expect(state.verified).toBe(false);
});

for (const [status, error, text] of [
  [401, "ADMIN_TOTP_INVALID", "인증번호가 일치하지"],
  [429, "TOO_MANY_REQUESTS", "잠시 제한"],
  [503, "AUTHENTICATION_UNAVAILABLE", "지금은 인증"],
] as const) {
  test(`${status} 오류는 갱신 우회 없이 같은 화면에서 처리`, async ({
    page,
  }) => {
    const state = await setup(page);
    state.status = status;
    state.error = error;
    await visit(page);
    await page.getByLabel("인증번호", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "인증하고 로그인" }).click();
    await expect(page.locator("section").getByRole("alert")).toContainText(
      text,
    );
    expect(state.me).toBe(0);
    expect(state.refresh).toBe(0);
  });
}

test("만료되면 비밀키 제거와 재로그인 안내", async ({ page }) => {
  const state = await setup(page, "PASS_REQUIRED");
  await visit(page);
  state.expiresAt = new Date(Date.now() + 1300).toISOString();
  await page.getByRole("button", { name: "PASS로 본인인증" }).click();
  await expect(
    page.getByRole("link", { name: "다시 로그인", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('section[aria-label="관리자 2차 인증"] svg'),
  ).toHaveCount(0);
});

test("다른 PASS 요청 ID는 등록에 사용하지 않는다", async ({ page }) => {
  const state = await setup(page, "PASS_REQUIRED");
  await page.goto("/auth/totp?identityVerificationId=other-account-request");
  await expect(
    page.getByRole("link", { name: "다시 로그인", exact: true }),
  ).toBeVisible();
  expect(state.enrollmentCalls).toBe(0);
});

test("챌린지 없는 직접 접근은 로그인부터 재시작", async ({ page }) => {
  const state = await setup(page);
  state.challengeError = true;
  await visit(page);
  await expect(
    page.getByRole("link", { name: "다시 로그인", exact: true }),
  ).toBeVisible();
  expect(state.me).toBe(0);
});

test("모바일·PC 실제 화면 레이아웃과 스크린샷", async ({ page }, testInfo) => {
  await setup(page);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await visit(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('section[aria-label="관리자 2차 인증"]')
      .screenshot({ path: testInfo.outputPath(`totp-${width}.png`) });
  }
});
