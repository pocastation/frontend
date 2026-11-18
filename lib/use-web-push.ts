"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import {
  clearLocalPush,
  pushRegistration,
  pushSettingsApi,
  subscribeToPush,
  supportsWebPush,
  usesApplicationKey,
  type PushRegistration,
  type PushSettings,
} from "./web-push";

type DeviceState = {
  settings: PushSettings;
  registration?: ServiceWorkerRegistration;
  permission: NotificationPermission;
  active: boolean;
};

async function waitForRegistration() {
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

export function useWebPush(enabled: boolean, memberId: string) {
  const { fetchWithAuth } = useAuth();
  const fetchSettings = useRef(fetchWithAuth);
  useEffect(() => { fetchSettings.current = fetchWithAuth; }, [fetchWithAuth]);

  const [state, setState] = useState<DeviceState>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changing = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let query = 0;
    async function load() {
      if (changing.current) return;
      const id = ++query;
      try {
        const path = pushSettingsApi();
        const settings = await fetchSettings.current<PushSettings>(path, { cache: "no-store" });
        const registration = settings.publicKey && supportsWebPush() ? await waitForRegistration() : undefined;
        const permission = registration ? Notification.permission : "denied";
        const subscription = permission === "granted" ? await registration?.pushManager.getSubscription() : null;
        if (disposed || id !== query || changing.current) return;
        const active = Boolean(settings.publicKey && subscription && settings.endpoint === subscription.endpoint &&
          usesApplicationKey(subscription, settings.publicKey));
        if (settings.endpoint && registration && !active) {
          await fetchSettings.current<PushSettings>(path, {
            method: "PUT",
            body: { memberId, categories: settings.categories, subscription: null, expectedEndpoint: settings.endpoint },
          });
        }
        if (!disposed && id === query && !changing.current) {
          setState({ settings, registration, permission, active });
          setError("");
        }
      } catch {
        if (!disposed && id === query && !changing.current) setError("푸시 알림 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, memberId]);

  async function save(subscription: PushRegistration | null, categories: string[], base: DeviceState) {
    const settings = await fetchSettings.current<PushSettings>(pushSettingsApi(), {
      method: "PUT",
      body: { memberId, categories, subscription, expectedEndpoint: base.active ? base.settings.endpoint : null },
    });
    setState({ ...base, settings, permission: Notification.permission, active: Boolean(settings.endpoint) });
  }

  async function change(work: (base: DeviceState) => Promise<void>) {
    if (!enabled || !state || changing.current) return false;
    changing.current = true;
    setSaving(true);
    setError("");
    try {
      await work(state);
      return true;
    } catch (cause) {
      if (state.registration) {
        setState((current) => current && { ...current, permission: Notification.permission });
      }
      setError(cause instanceof Error ? cause.message : "푸시 알림 설정을 저장하지 못했어요.");
      return false;
    } finally {
      changing.current = false;
      setSaving(false);
    }
  }

  function toggleMaster(initialCategories?: string[]) {
    return change(async (base) => {
      const { settings, registration } = base;
      if (base.active) {
        await save(null, settings.categories, base);
        await clearLocalPush(memberId);
      } else if (registration && settings.publicKey) {
        const subscription = await subscribeToPush(registration, settings.publicKey, memberId);
        await save(pushRegistration(subscription), settings.configured ? settings.categories :
          initialCategories ?? settings.categories, base);
      }
    });
  }

  function toggleCategory(key: string) {
    return change(async (base) => {
      if (!base.active || !base.registration) return;
      const { categories } = base.settings;
      const next = categories.includes(key) ? categories.filter((item) => item !== key) : [...categories, key];
      const subscription = await base.registration.pushManager.getSubscription();
      if (!subscription || Notification.permission !== "granted" || subscription.endpoint !== base.settings.endpoint) {
        await save(null, categories, base);
        throw new Error("푸시 연결이 종료됐어요. 푸시 알림을 다시 켜 주세요.");
      }
      await save(pushRegistration(subscription), next, base);
    });
  }

  const active = state?.active === true && state.permission === "granted";
  const canEnable = Boolean(state?.registration && state.settings.publicKey && state.permission !== "denied");
  let unavailable = "";
  if (state && !state.settings.publicKey) unavailable = "푸시 알림을 준비 중이에요.";
  else if (state && !state.registration) unavailable = "이 기기에서 푸시 알림을 사용할 수 없어요.";
  else if (state?.permission === "denied") unavailable = "기기 설정에서 포카스테이션 알림을 허용해 주세요.";

  return { state, active, saving, error, canEnable, unavailable, toggleMaster, toggleCategory };
}
