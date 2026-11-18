import { isStandalonePwa } from "./standalone-pwa";
import type { ApiFetchOptions } from "./api";

export const PUSH_SETTINGS_PATH = "/mypage/push-settings";

const INSTALLATION_KEY = "pocastation.push.installation";
const OWNER_KEY = "pocastation.push.owner";
const enabledKey = (memberId: string) => "pocastation.push.enabled." + memberId;
export const PUSH_RESTORED_EVENT = "pocastation:push-restored";

export async function withPushLock(work: () => Promise<void>): Promise<void> {
  if (navigator.locks) await navigator.locks.request("pocastation.push.binding", work);
  else await work();
}

export function rememberPushEnabled(memberId: string, enabled: boolean) {
  localStorage.setItem(enabledKey(memberId), String(enabled));
}

export function wantsPush(memberId: string, settings: PushSettings) {
  const choice = localStorage.getItem(enabledKey(memberId));
  if (choice !== null) return choice === "true";
  return !settings.configured || Boolean(settings.endpoint) || localStorage.getItem(OWNER_KEY) === memberId;
}
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

export async function waitForRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing?.active) return existing;
  let timer: number | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((resolve) => { timer = window.setTimeout(resolve, 5000); }),
    ]);
  } finally {
    window.clearTimeout(timer);
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

export async function clearLocalPush(memberId: string, onAccountChange = false, rememberForLogin = false) {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (!owner || (onAccountChange ? owner === memberId : owner !== memberId)) return;
    const registration = await navigator.serviceWorker?.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (localStorage.getItem(OWNER_KEY) !== owner) return;
    // Older installations only stored the subscription owner.
    if ((rememberForLogin || onAccountChange) && subscription && localStorage.getItem(enabledKey(owner)) === null) {
      rememberPushEnabled(owner, true);
    }
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

export async function requestPushPermission() {
  if (!isStandalonePwa() || !supportsWebPush()) throw new Error("설치한 앱에서 푸시 알림을 켜 주세요.");
  // Request permission directly from the click, before awaiting a network call or worker discovery.
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "기기 설정에서 포카스테이션 알림을 허용해 주세요." : "푸시 알림이 허용되지 않았어요.");
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration, publicKey: string, memberId: string) {
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

export async function restorePushOnLogin(
  memberId: string, fetchSettings: <T>(path: string, options?: ApiFetchOptions) => Promise<T>,
  isCurrent: () => boolean,
) {
  if (!isStandalonePwa() || !supportsWebPush()) return;
  await withPushLock(async () => {
    if (!isCurrent()) return;
    await clearLocalPush(memberId, true);
    if (Notification.permission !== "granted" || !isCurrent()) return;
    const owner = localStorage.getItem(OWNER_KEY);
    const path = pushSettingsApi();
    const settings = await fetchSettings<PushSettings>(path, { cache: "no-store" });
    if (!wantsPush(memberId, settings) || !settings.publicKey || !isCurrent()) return;
    const registration = await waitForRegistration();
    if (!registration || !isCurrent()) return;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription || owner !== memberId || !usesApplicationKey(subscription, settings.publicKey)) {
      if (Notification.permission !== "granted" || !isCurrent()) return;
      await subscription?.unsubscribe();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: applicationKeyBytes(settings.publicKey),
      });
    }
    if (!isCurrent()) return;
    rememberPushOwner(memberId);
    if (settings.endpoint !== subscription.endpoint) {
      await fetchSettings(path, { method: "PUT", body: {
        memberId, categories: settings.categories, subscription: pushRegistration(subscription), expectedEndpoint: null,
      } });
      window.dispatchEvent(new Event(PUSH_RESTORED_EVENT));
    }
    rememberPushEnabled(memberId, true);
  });
}
