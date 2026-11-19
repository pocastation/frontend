import { expect, test, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const path = "/mypage/push-settings";
const memberId = "88ab5bc4-a65c-4bb3-bd49-e567a3afbc0d";

async function mockApi(context: BrowserContext) {
  let calls = 0;
  let settings = {
    publicKey: "BA",
    endpoint: null as string | null,
    configured: false,
    categories: ["EXCHANGE_REQUEST", "EXCHANGE_MATCH", "EXCHANGE_CHAT", "EXCHANGE_COMPLETION",
      "EXCHANGE_CLOSURE", "EXCHANGE_MODERATION", "NEW_OFFER", "LISTING_REVIEW", "LISTING_CLOSURE",
      "OFFER_RESULT", "LISTING_CHANGE", "PAYMENT", "SHIPPING", "CONFIRMATION", "REFUND", "RETURN_DISPUTE", "INQUIRY", "CAMPAIGN"],
  };
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let data: unknown = { content: [], totalElements: 0 };
    if (pathname === "/api/auth/refresh") data = { accessToken: "test-access", expiresInSeconds: 900 };
    if (pathname === "/api/auth/logout") settings.endpoint = null;
    if (pathname === "/api/members/me") data = { id: memberId, nickname: "테스트", role: "USER", email: null };
    if (pathname.endsWith("/unread-count")) data = { count: 0 };
    if (pathname.startsWith("/api/members/me/web-push/")) {
      calls++;
      if (request.method() === "PUT") {
        const body = request.postDataJSON();
        settings = {
          ...settings,
          configured: true,
          endpoint: body.subscription?.endpoint ?? null,
          categories: body.categories,
        };
      }
      data = settings;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return { calls: () => calls };
}

async function simulatePushDevice(context: BrowserContext, standalone: boolean, result: NotificationPermission, initial: NotificationPermission = "default") {
  await context.addInitScript(({ standalone, result, initial }) => {
    Object.defineProperty(navigator, "standalone", { value: standalone });
    let permission = (localStorage.getItem("test.permission") ?? initial) as NotificationPermission;
    let requests = 0;
    Object.defineProperty(Notification, "permission", { get: () => permission });
    Notification.requestPermission = async () => {
      requests++;
      permission = result;
      localStorage.setItem("test.permission", result);
      return permission;
    };
    Object.defineProperty(window, "pushPermissionRequests", { get: () => requests });
    let subscription: object | null = null;
    const registration = {
      active: {},
      getNotifications: async () => [],
      pushManager: {
        getSubscription: async () => subscription,
        subscribe: async () => {
          const endpoint = "https://fcm.googleapis.com/fcm/send/browser-test";
          subscription = {
            endpoint,
            options: { applicationServerKey: Uint8Array.of(4).buffer },
            toJSON: () => ({ endpoint, keys: { p256dh: "mock", auth: "mock" } }),
            unsubscribe: async () => { subscription = null; return true; },
          };
          return subscription;
        },
      },
    };
    Object.defineProperty(navigator.serviceWorker, "getRegistration", { value: async () => registration });
  }, { standalone, result, initial });
}

function permissionRequests() {
  return (window as Window & { pushPermissionRequests?: number }).pushPermissionRequests;
}

test("서비스 워커가 푸시 제목을 전달하고 열린 창이나 새 창에 대상 주소를 연다", async () => {
  const origin = "https://staging.pocastation.com";
  const destination = origin + "/exchanges/31/thread/messages?notificationId=73";
  const handlers = new Map<string, (event: Record<string, unknown>) => void>();
  let shownTitle = "";
  let shownOptions: { body: string; data: { url: string } } | undefined;
  let openedUrl = "";
  let openedClient: object | null = null;
  let windows: object[] = [];
  const clicks = new Map<string, Response>();
  const self = {
    location: { origin },
    navigator: {},
    addEventListener(name: string, handler: (event: Record<string, unknown>) => void) {
      handlers.set(name, handler);
    },
    registration: {
      async showNotification(title: string, options: typeof shownOptions) {
        shownTitle = title;
        shownOptions = options;
      },
    },
    clients: {
      async matchAll() { return windows; },
      async openWindow(url: string) { openedUrl = url; return openedClient; },
    },
  };
  const caches = { open: async () => ({ put: (key: string, response: Response) => clicks.set(key, response) }) };
  runInNewContext(readFileSync("public/sw.js", "utf8"), { self, URL, Response, caches });

  async function dispatch(name: string, event: Record<string, unknown>) {
    let done: Promise<unknown> | undefined;
    handlers.get(name)?.({ ...event, waitUntil: (promise: Promise<unknown>) => { done = promise; } });
    expect(done).toBeDefined();
    await done;
  }

  const body = "교환 대화에 새 메시지가 왔어요.";
  await dispatch("push", { data: { json: () => ({ title: "새 채팅", body, url: destination }) } });
  expect(shownTitle).toBe("새 채팅");
  expect(shownOptions).toMatchObject({ body, navigate: destination, data: { url: destination } });
  const image = "/media/photos/example_display.jpg";
  await dispatch("push", { data: { json: () => ({ title: "행사 소식", body, image, url: destination }) } });
  expect(shownOptions).toMatchObject({ image });

  let closed = false;
  const notification = { data: shownOptions?.data, close() { closed = true; } };
  await dispatch("notificationclick", { notification });
  expect(openedUrl).toBe(destination);
  expect(closed).toBe(true);

  openedUrl = "";
  let navigatedTo = "";
  let focused = false;
  windows = [{
    url: origin + "/mypage",
    async navigate(url: string) {
      navigatedTo = url;
      return { async focus() { focused = true; } };
    },
  }];
  await dispatch("notificationclick", { notification });
  expect(navigatedTo).toBe(destination);
  expect(focused).toBe(true);
  expect(openedUrl).toBe("");

  const requests = origin + "/exchanges/31/requests";
  windows = [{ url: "" }];
  openedClient = {
    url: origin + "/",
    async navigate(url: string) { navigatedTo = url; },
  };
  await dispatch("push", { data: { json: () => ({ title: "교환 신청", url: "/exchanges/31/requests" }) } });
  expect(shownOptions).toMatchObject({ navigate: requests, data: { url: requests } });
  await dispatch("notificationclick", { notification: { ...notification, data: shownOptions?.data } });
  expect(openedUrl).toBe(requests);
  expect(navigatedTo).toBe(requests);

  await dispatch("push", { data: { json: () => ({ body, url: "https://example.com/outside" }) } });
  expect(shownTitle).toBe("포카스테이션");
  expect(shownOptions).toMatchObject({ body, navigate: origin + "/notifications", data: { url: origin + "/notifications" } });

  const campaign = "/notifications/campaigns/37";
  await dispatch("push", { data: { json: () => ({ title: "행사", url: campaign }) } });
  expect(shownOptions).not.toHaveProperty("navigate");
  expect(clicks.size).toBe(0);
  windows = [];
  openedClient = null;
  await dispatch("notificationclick", { notification: { ...notification, data: shownOptions?.data } });
  expect(openedUrl).toBe(origin + campaign);
  expect(await clicks.get("/__campaign-click")?.json()).toMatchObject({ path: campaign });
});

for (const launch of ["cold", "resume"]) {
  test(`관리자 푸시를 누른 후 앱이 이전 화면으로 열려도 본문을 한 번만 연다 (${launch})`, async ({ context, page }) => {
    await mockApi(context);
    await simulatePushDevice(context, true, "granted");
    const detail = "/notifications/campaigns/37";
    await context.route("**/api/notification-campaigns/37/open", route => route.fulfill({
      json: { success: true, data: { title: "클릭한 행사 소식", message: "행사 본문" } },
    }));
    await page.goto("/mypage");
    await page.evaluate(async path => {
      const cache = await caches.open("pocastation-campaign-click");
      await cache.put("/__campaign-click", Response.json({ path, expiresAt: Date.now() + 60_000 }));
    }, detail);
    if (launch === "cold") await page.goto("/");
    else await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page).toHaveURL(new RegExp(detail + "$"), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "클릭한 행사 소식" })).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(async () => Boolean(await caches.match("/__campaign-click")))).toBe(false);
    await page.goto("/mypage");
    await expect(page).toHaveURL(/\/mypage$/);
  });
}

test("채팅 푸시 상세 페이지는 가장 최근 메시지부터 보여 주고 해당 알림을 읽음 처리한다", async ({ context, page }) => {
  await mockApi(context);
  await context.route("**/api/exchanges/31/thread?latestMessages=true", (route) => route.fulfill({
    json: {
      success: true,
      data: {
        counterpartNickname: "교환 상대",
        messages: [
          { id: 1, mine: true, body: "먼저 보낸 메시지", createdAt: "2026-11-18T00:00:00Z" },
          { id: 2, mine: false, body: "가장 최근에 받은 메시지", createdAt: "2026-11-18T00:01:00Z" },
        ],
      },
    },
  }));
  await context.route("**/api/members/me/notifications/73/read", (route) => route.fulfill({ status: 204 }));
  const read = page.waitForRequest((request) => request.url().endsWith("/notifications/73/read"));

  await page.goto("/exchanges/31/thread/messages?notificationId=73");
  await expect(page.getByRole("listitem").filter({ hasText: "가장 최근에 받은 메시지" })).toBeVisible();
  await expect(page.locator("ol li").first()).toContainText("가장 최근에 받은 메시지");
  expect((await read).method()).toBe("PATCH");
});

test("배송지 푸시에서 다른 구매 건이 있어도 알림에 연결된 주문의 주소 입력을 연다", async ({ context, page }) => {
  await mockApi(context);
  const first = { id: 41, title: "다른 구매 상품", status: "ENDED_SOLD", saleType: "INSTANT", startPrice: 10000 };
  const target = { ...first, id: 42, title: "알림에 연결된 구매 상품" };
  const order = { status: "PAID", fulfillmentStatus: "AWAITING_SHIPMENT", disputeStatus: "NONE", hasDeliveryAddress: false };
  await context.route("**/api/members/me/instant-purchases?*", (route) => route.fulfill({
    json: { success: true, data: { content: [first, target], totalElements: 2 } },
  }));
  await context.route("**/api/members/me/orders/status?*", (route) => route.fulfill({
    json: { success: true, data: [{ ...order, auctionId: 41 }, { ...order, auctionId: 42 }] },
  }));
  await context.route("**/api/members/me/delivery-addresses", (route) => route.fulfill({
    json: { success: true, data: [] },
  }));

  await page.goto("/mypage?tab=purchases&auctionId=42&address=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("알림에 연결된 구매 상품");
  await expect(dialog).not.toContainText("다른 구매 상품");
});

test("일반 웹에서 설정 URL은 마이페이지로 돌아가고 권한을 묻지 않는다", async ({ context, page }) => {
  const api = await mockApi(context);
  await simulatePushDevice(context, false, "granted");
  await page.goto(path);
  await expect(page).toHaveURL(/\/mypage$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: "푸시 알림", exact: true })).toHaveCount(0);
  expect(await page.evaluate(permissionRequests)).toBe(0);
  expect(api.calls()).toBe(0);
});

test("PWA의 계정 메뉴에서만 설정을 열고 일시 중지 후 선택을 되살린다", async ({ context, page }) => {
  await mockApi(context);
  await simulatePushDevice(context, true, "granted");
  await page.goto("/mypage");
  await page.getByRole("link", { name: "푸시 알림", exact: true }).filter({ visible: true }).click();
  const master = page.getByRole("switch", { name: "푸시 알림 받기" });
  await expect(page.getByRole("heading", { name: "푸시 알림", exact: true })).toBeInViewport();
  const chat = page.getByRole("switch", { name: "교환 채팅" });
  const inquiry = page.getByRole("switch", { name: "1:1 문의 답변" });
  await expect(page.getByRole("switch")).toHaveCount(19);
  await expect(master).toBeEnabled();
  await expect(chat).toBeDisabled();
  expect(await page.evaluate(permissionRequests)).toBe(0);

  await expect(page.getByRole("switch", { checked: true })).toHaveCount(19);
  await page.getByRole("button", { name: "기기 알림 허용" }).click();
  await expect(chat).toBeChecked();
  await chat.click();
  await expect(chat).not.toBeChecked();

  await master.click();
  await expect(master).not.toBeChecked();
  await expect(inquiry).toBeDisabled();
  await master.click();
  await expect(inquiry).toBeChecked();
  await expect(chat).toBeEnabled();
  await expect(chat).not.toBeChecked();
  expect(await page.evaluate(permissionRequests)).toBe(1);

  await page.getByRole("link", { name: "마이페이지로 돌아가기" }).click();
  await page.getByRole("banner").getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pocastation.push.owner"))).toBeNull();
  // Next authenticated load represents the same member with a new session and no bound endpoint.
  await page.goto(path);
  await expect(master).toBeChecked();
  await expect(chat).toBeEnabled();
  await expect(chat).not.toBeChecked();
  await expect(inquiry).toBeChecked();
  expect(await page.evaluate(permissionRequests)).toBe(0);
  await master.click();
  await expect(master).not.toBeChecked();
  await page.reload();
  await expect(master).not.toBeChecked();
  await expect(chat).toBeDisabled();
  await expect(inquiry).toBeChecked();
});

test("권한 거부 시 실제로 푸시를 켜거나 기기에 저장하지 않는다", async ({ context, page }) => {
  const api = await mockApi(context);
  await simulatePushDevice(context, true, "denied");
  await page.goto(path);
  const master = page.getByRole("switch", { name: "푸시 알림 받기" });
  await expect(master).toBeEnabled();
  const callsBeforeClick = api.calls();
  await page.getByRole("button", { name: "기기 알림 허용" }).click();
  await expect(master).toBeChecked();
  await expect(page.getByText("기기 설정에서 포카스테이션 알림을 허용해 주세요.", { exact: true })).toBeVisible();
  expect(api.calls()).toBe(callsBeforeClick);
});

test("기기 권한을 이미 허용한 신규 PWA는 설정 방문 없이 운영 알림을 포함해 구독한다", async ({ context, page }) => {
  await mockApi(context);
  await simulatePushDevice(context, true, "granted", "granted");
  const firstSave = page.waitForRequest((req) => req.method() === "PUT" && req.url().includes("/web-push/"));
  await page.goto("/mypage");
  const data = (await firstSave).postDataJSON();
  expect(new Set(data.categories).size).toBe(18);
  expect(data.categories).toContain("CAMPAIGN");
  expect(data.subscription.endpoint).toBeTruthy();
  expect(await page.evaluate(permissionRequests)).toBe(0);
});
