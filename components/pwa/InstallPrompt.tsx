"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 홈 화면 설치 유도 — 모바일 폭에서만, 한 번 닫으면 다시 뜨지 않는다.
 *
 * <p>플랫폼이 둘로 갈린다.
 * - **안드로이드/크롬**: 브라우저가 `beforeinstallprompt`를 주면 그걸 잡아 두었다가 우리 버튼에서 띄운다.
 * - **iOS 사파리**: 이 이벤트가 없다. 설치 경로가 «공유 → 홈 화면에 추가»뿐이라 **안내만** 한다.
 *
 * <p>띄우지 않는 경우: 이미 설치돼 실행 중일 때(`display-mode: standalone`), 카카오톡 같은 인앱
 * 브라우저(설치 자체가 불가능해서 안내가 거짓말이 된다), 사용자가 한 번 닫은 뒤.
 */

const DISMISS_KEY = "pocastation.install-prompt.dismissed";
// 첫 화면에 바로 끼어들지 않는다. 읽던 것을 가리면 배너가 아니라 방해가 된다.
const SHOW_DELAY_MS = 4000;

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isInAppBrowser(ua: string) {
  return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua);
}

function isIosSafari(ua: string) {
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // iOS의 크롬·파이어폭스는 홈 화면 추가 메뉴가 없다 — 사파리에서만 안내한다.
  return isIos && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS 사파리는 표준 미디어쿼리 대신 이 비표준 플래그로 설치 실행 여부를 알린다.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent;
    if (isInAppBrowser(ua)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onBeforeInstall = (e: Event) => {
      // 브라우저 기본 배너를 막고, 우리 지면에서 우리 문구로 띄운다.
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari(ua)) {
      // 상태 갱신은 타이머 안에서 한다 — 효과 본문에서 동기적으로 setState하면 렌더가 한 번 더 돈다.
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, SHOW_DELAY_MS);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    // 선택 결과와 무관하게 이벤트는 한 번만 쓸 수 있다. 거절했다면 다시 조르지 않는다.
    await deferred.userChoice;
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="홈 화면에 추가"
      className="fixed inset-x-0 z-[400] px-[14px] sm:hidden"
      // 하단탭 위에 얹는다. 셸이 없는 화면에서는 변수가 없어 화면 바닥에서 12px 뜬다.
      style={{ bottom: "calc(12px + var(--mobile-tabbar-h, 0px))" }}
    >
      <div className="flex items-center gap-3 rounded-r3 border border-border bg-white p-3 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘, 최적화 대상이 아니다 */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="flex-shrink-0 rounded-[9px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-text-1">홈 화면에 추가하기</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-3">
            {iosHint ? "공유 버튼 → «홈 화면에 추가»를 누르면 앱처럼 열려요" : "앱처럼 전체 화면으로 빠르게 열려요"}
          </p>
        </div>
        {!iosHint && (
          <button
            type="button"
            onClick={install}
            className={`h-9 flex-shrink-0 rounded-[7px] bg-primary px-3.5 text-[12.5px] font-extrabold text-white ${FOCUS_RING}`}
          >
            추가
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className={`flex h-9 w-7 flex-shrink-0 items-center justify-center text-text-3 ${FOCUS_RING}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
