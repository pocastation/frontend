import { isStandalonePwa } from "./standalone-pwa";

export const PUSH_SETTINGS_PATH = "/mypage/push-settings";

const INSTALLATION_KEY = "pocastation.push.installation";
const OWNER_KEY = "pocastation.push.owner";
const EXCHANGE_OFFER_KEY = "pocastation.push.exchange-offer";

export function noteExchangeRequestForPush(requestId: number) {
  try {
    sessionStorage.setItem(EXCHANGE_OFFER_KEY, `${requestId}:${Date.now() + 5 * 60_000}`);
  } catch {
    // Storage availability must not affect an exchange request that already succeeded.
  }
}

export function hasExchangePushOffer(requestId: number) {
  try {
    const [id, expiresAt] = (sessionStorage.getItem(EXCHANGE_OFFER_KEY) ?? "").split(":");
    return id === String(requestId) && Number(expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function dismissExchangePushOffer() {
  try {
    sessionStorage.removeItem(EXCHANGE_OFFER_KEY);
  } catch {
    // The offer also expires on its own.
  }
}

export function supportsWebPush() {
  return window.isSecureContext && "serviceWorker" in navigator &&
    "PushManager" in window && "Notification" in window;
}

export function pushSettingsApi() {
  let installationId = localStorage.getItem(INSTALLATION_KEY);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(INSTALLATION_KEY, installationId);
  }
  return `/api/members/me/web-push/${installationId}`;
}

export function rememberPushOwner(memberId: string) {
  localStorage.setItem(OWNER_KEY, memberId);
}

export async function clearLocalPush(memberId: string, onAccountChange = false) {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (!owner || (onAccountChange ? owner === memberId : owner !== memberId)) return;
    const registration = await navigator.serviceWorker?.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (localStorage.getItem(OWNER_KEY) !== owner) return;
    await subscription?.unsubscribe();
    const notifications = await registration?.getNotifications();
    notifications?.forEach((notification) => notification.close());
    if (localStorage.getItem(OWNER_KEY) === owner) localStorage.removeItem(OWNER_KEY);
  } catch {
    // The server also checks the bound login session and discards expired endpoints.
  }
}

export type PushSettings = {
  publicKey: string | null;
  endpoint: string | null;
  configured: boolean;
  categories: string[];
};

export type PushRegistration = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function applicationKeyBytes(key: string) {
  const urlSafe = key.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(urlSafe), (char) => char.charCodeAt(0));
}

export function usesApplicationKey(subscription: PushSubscription, key: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const actual = new Uint8Array(current);
  const expected = applicationKeyBytes(key);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export async function subscribeToPush(registration: ServiceWorkerRegistration, publicKey: string, memberId: string) {
  if (!isStandalonePwa() || !supportsWebPush()) throw new Error("설치한 앱에서 푸시 알림을 켜 주세요.");
  // Request permission directly from the click, before awaiting a network call or worker discovery.
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "기기 설정에서 포카스테이션 알림을 허용해 주세요." : "푸시 알림이 허용되지 않았어요.");
  }
  await clearLocalPush(memberId, true);
  // A browser may still report a subscription after the provider has expired it.
  const previous = await registration.pushManager.getSubscription();
  await previous?.unsubscribe();
  rememberPushOwner(memberId);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationKeyBytes(publicKey),
  });
}

export function pushRegistration(subscription: PushSubscription): PushRegistration {
  const { keys } = subscription.toJSON();
  if (!keys?.p256dh || !keys.auth) throw new Error("푸시 알림 구독을 다시 시작해 주세요.");
  return { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth };
}
