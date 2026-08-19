"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 홈 화면 설치 유도 — 모바일 폭에서만.
 *
 * <p>플랫폼이 둘로 갈린다.
 * - **안드로이드/크롬**: 브라우저가 `beforeinstallprompt`를 주면 그걸 잡아 두었다가 우리 버튼에서 띄운다.
 * - **iOS 사파리**: 이 이벤트가 없다. 설치 경로가 «공유 → 홈 화면에 추가»뿐이라 **안내만** 한다.
 *
 * <p>띄우지 않는 경우: 이미 설치돼 실행 중일 때(`display-mode: standalone`), 카카오톡 같은 인앱
 * 브라우저(설치 자체가 불가능해서 안내가 거짓말이 된다), 아래 세 가지 억제 중 하나에 걸릴 때.
 *
 * <p><b>물러나는 방법이 세 단계다.</b> 예전에는 닫기(X) 하나뿐이었고 그게 곧 영구 차단이었다 —
 * 그래서 <b>그냥 무시하고 넘어간 사람에게는 방문할 때마다 다시 떴다.</b> iOS는 설치 버튼도 없이
 * 안내문만 있는 배너라 이게 특히 성가시다.
 * 1. <b>닫기(X)</b> — 이번 방문 동안만(`sessionStorage`). 지금 읽던 걸 가려서 치운 것뿐이다.
 * 2. <b>오늘 하루 보지 않기</b> — 24시간(`localStorage` 타임스탬프).
 * 3. <b>{@link MAX_SHOWS}회까지만 노출</b> — 아무 버튼도 안 누르고 계속 무시하는 사람에게는
 *    저절로 멈춘다. 무시는 거절의 한 형태다.
 *
 * <p>⚠️ iOS 사파리는 ITP 때문에 <b>7일 넘게 방문이 없으면 localStorage를 지운다.</b> 그러면 억제
 * 기록도 함께 사라져 노출 횟수가 0부터 다시 센다. 비로그인 사용자의 상태를 서버에 둘 수는 없어
 * (쿠키도 같은 제약을 받는다) 여기까지가 한계다.
 */

// 억제 상태 한 벌. 키를 여러 개로 흩으면 «오늘 하루»와 «영구»가 서로를 덮어쓰는 조합이 생긴다.
const STORE_KEY = "pocastation.install-prompt.v2";
// 예전 키(값 "1" = 영구 차단). 이미 닫아 둔 사용자에게 배너가 되살아나지 않도록 계속 읽는다.
const LEGACY_DISMISS_KEY = "pocastation.install-prompt.dismissed";
// 닫기(X)는 탭 세션 동안만 억제한다 — 페이지를 옮겨 다녀도 같은 방문에서는 다시 안 뜬다.
const SESSION_KEY = "pocastation.install-prompt.session";
const SNOOZE_MS = 24 * 60 * 60 * 1000;
// 아무 것도 누르지 않고 무시할 때 그만두는 횟수.
const MAX_SHOWS = 3;
// 첫 화면에 바로 끼어들지 않는다. 읽던 것을 가리면 배너가 아니라 방해가 된다.
const SHOW_DELAY_MS = 4000;

type SuppressState = {
  /** 영구 차단 — 설치 프롬프트에 응답했거나 예전 키로 닫은 사용자. */
  forever?: boolean;
  /** 이 시각(ms)까지 억제. «오늘 하루 보지 않기». */
  until?: number;
  /** 지금까지 실제로 화면에 띄운 횟수. */
  shows?: number;
};

function readState(): SuppressState {
  try {
    if (localStorage.getItem(LEGACY_DISMISS_KEY)) return { forever: true };
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SuppressState) : {};
  } catch {
    // 사파리 프라이빗 브라우징 등에서 저장소 접근이 막힐 수 있다 — 그때는 억제 없이 동작한다.
    return {};
  }
}

function writeState(next: SuppressState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // 무시 — 저장이 안 되면 다음 방문에 다시 뜬다. 배너를 못 띄우는 것보다 낫다.
  }
}

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

    const state = readState();
    if (state.forever) return;
    if (state.until && Date.now() < state.until) return;
    if ((state.shows ?? 0) >= MAX_SHOWS) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // 저장소가 막힌 환경 — 억제 없이 진행한다.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    // 실제로 화면에 띄우는 순간에만 횟수를 센다. 조건만 통과하고 안 뜬 경우(예: 안드로이드인데
    // 브라우저가 beforeinstallprompt를 안 준 경우)까지 세면 보지도 않은 노출이 소진된다.
    const show = () => {
      setVisible(true);
      writeState({ ...state, shows: (state.shows ?? 0) + 1 });
    };

    const onBeforeInstall = (e: Event) => {
      // 브라우저 기본 배너를 막고, 우리 지면에서 우리 문구로 띄운다.
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      timer = setTimeout(show, SHOW_DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari(ua)) {
      // 상태 갱신은 타이머 안에서 한다 — 효과 본문에서 동기적으로 setState하면 렌더가 한 번 더 돈다.
      timer = setTimeout(() => {
        setIosHint(true);
        show();
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

  // 닫기(X) — 이번 방문만. 지금 화면을 가려서 치운 것이지 «앞으로 보지 않겠다»가 아니다.
  function closeForNow() {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // 무시 — 다음 페이지에서 다시 뜰 수 있다.
    }
  }

  // 오늘 하루 보지 않기 — 24시간.
  function snoozeToday() {
    setVisible(false);
    writeState({ ...readState(), until: Date.now() + SNOOZE_MS });
  }

  async function install() {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    // 선택 결과와 무관하게 이벤트는 한 번만 쓸 수 있다. 거절했다면 다시 조르지 않는다.
    await deferred.userChoice;
    writeState({ ...readState(), forever: true });
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
      <div className="rounded-r3 border border-border bg-white p-3 shadow-card">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘, 최적화 대상이 아니다 */}
          <img src="/icons/icon-192.png" alt="" width={40} height={40} className="flex-shrink-0 rounded-[9px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-text-1">홈 화면에 추가하기</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-3">
              {iosHint ? "공유 버튼 → «홈 화면에 추가»를 누르면 앱처럼 열려요" : "앱처럼 전체 화면으로 빠르게 열려요"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeForNow}
            aria-label="닫기"
            className={`flex h-9 w-7 flex-shrink-0 items-center justify-center text-text-3 ${FOCUS_RING}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 물러나는 길을 버튼으로 세운다. iOS는 설치 버튼이 없어 이 줄이 «오늘 하루» 하나뿐이다 —
            안내문만 있는 배너를 매번 다시 보게 하지 않으려는 것이 이 줄의 목적이다. */}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={snoozeToday}
            className={`h-9 flex-1 rounded-[7px] border border-border-2 text-[12.5px] font-bold text-text-2 ${FOCUS_RING}`}
          >
            오늘 하루 보지 않기
          </button>
          {!iosHint && (
            <button
              type="button"
              onClick={install}
              className={`h-9 flex-1 rounded-[7px] bg-primary text-[12.5px] font-extrabold text-white ${FOCUS_RING}`}
            >
              추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
