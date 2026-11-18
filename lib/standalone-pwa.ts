import { useSyncExternalStore } from "react";

const displayMode = "(display-mode: standalone)";
export const IOS_INSTALL_GUIDE_EVENT = "pocastation:show-ios-install-guide";

export function isStandalonePwa() {
  return window.matchMedia(displayMode).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function canShowIosInstallGuide() {
  const { userAgent, maxTouchPoints } = navigator;
  const appleMobile = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  return appleMobile && /Safari/.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(userAgent) &&
    !isStandalonePwa();
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(displayMode);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useStandalonePwa() {
  return useSyncExternalStore(subscribe, isStandalonePwa, () => null);
}
