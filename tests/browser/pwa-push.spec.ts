import { expect, test, type BrowserContext } from "@playwright/test";

const path = "/mypage/push-settings";
const memberId = "88ab5bc4-a65c-4bb3-bd49-e567a3afbc0d";

async function mockApi(context: BrowserContext) {
  let calls = 0;
  let settings = {
    publicKey: "BA",
    endpoint: null as string | null,
    configured: false,
    categories: ["EXCHANGE_REQUEST", "EXCHANGE_MATCH", "EXCHANGE_CHAT", "INQUIRY"],
  };
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let data: unknown = { content: [], totalElements: 0 };
    if (pathname === "/api/auth/refresh") data = { accessToken: "test-access", expiresInSeconds: 900 };
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

async function simulatePushDevice(context: BrowserContext, standalone: boolean, result: NotificationPermission) {
  await context.addInitScript(({ standalone, result }) => {
    Object.defineProperty(navigator, "standalone", { value: standalone });
    let permission: NotificationPermission = "default";
    let requests = 0;
    Object.defineProperty(Notification, "permission", { get: () => permission });
    Notification.requestPermission = async () => {
      requests++;
      permission = result;
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
  }, { standalone, result });
}

function permissionRequests() {
  return (window as Window & { pushPermissionRequests?: number }).pushPermissionRequests;
}

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
  const master = page.getByRole("switch", { name: "푸시 알림 끄기" });
  await expect(page.getByRole("heading", { name: "푸시 알림", exact: true })).toBeInViewport();
  const chat = page.getByRole("switch", { name: "교환 채팅" });
  const inquiry = page.getByRole("switch", { name: "1:1 문의 답변" });
  await expect(page.getByRole("switch")).toHaveCount(18);
  await expect(master).toBeEnabled();
  await expect(chat).toBeDisabled();
  expect(await page.evaluate(permissionRequests)).toBe(0);

  await master.click();
  await expect(master).not.toBeChecked();
  await expect(chat).toBeChecked();
  await chat.click();
  await expect(chat).not.toBeChecked();

  await master.click();
  await expect(master).toBeChecked();
  await expect(inquiry).toBeDisabled();
  await master.click();
  await expect(inquiry).toBeChecked();
  await expect(chat).toBeEnabled();
  await expect(chat).not.toBeChecked();
  expect(await page.evaluate(permissionRequests)).toBe(1);
});

test("권한 거부 시 실제로 푸시를 켜거나 기기에 저장하지 않는다", async ({ context, page }) => {
  const api = await mockApi(context);
  await simulatePushDevice(context, true, "denied");
  await page.goto(path);
  const master = page.getByRole("switch", { name: "푸시 알림 끄기" });
  await expect(master).toBeEnabled();
  const callsBeforeClick = api.calls();
  await master.click();
  await expect(master).toBeChecked();
  await expect(master).toBeDisabled();
  await expect(page.getByText("기기 설정에서 포카스테이션 알림을 허용해 주세요.", { exact: true })).toBeVisible();
  expect(api.calls()).toBe(callsBeforeClick);
});
