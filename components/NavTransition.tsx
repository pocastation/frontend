"use client";

import { Suspense, use, useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { canAnimateNav, isWizardKey, rememberEntry, takePendingNav, type NavDirection } from "@/lib/nav-transition";

/**
 * 모바일 화면 전환(푸시 전환). 들어갈 때 새 화면이 오른쪽에서 덮고, 나올 때 반대로 빠진다.
 * 움직임은 `globals.css`의 「화면 전환」 절이 그린다. 이 컴포넌트는 그림이 없다.
 *
 * <p>들어가기(링크·router.push):
 * 1. 이동 전에 방향이 표시된다(`lib/nav-transition.ts`)
 * 2. 새 주소로 렌더가 시작되면 브라우저 View Transition을 열고, 지금 화면이 스냅숏으로 찍힐 때까지
 *    렌더를 멈춘다(`use`). 전환 렌더라 멈춘 동안 화면은 이전 페이지 그대로다
 * 3. 새 화면이 커밋되면 전환을 닫는다. 브라우저가 두 스냅숏 사이를 애니메이션한다
 *
 * <p>위저드(판매 등록·교환글 작성·교환 신청)는 옆으로 밀지 않고 아래에서 덮는다(open). 위저드에서 나갈 때는
 * 닫기든 뒤로가기든 아래로 내려간다(close).
 *
 * <p>히스토리 뒤로가기(router.back()·브라우저 뒤로)는 렌더를 멈출 수 없다. React가 popstate 안의 업데이트를
 * 스크롤 복원 때문에 동기로 그리기 때문이다. 그래서 popstate를 Next보다 먼저 받아 멈춰 두고, 전환을 열어
 * 지금 화면을 찍은 다음 같은 이벤트를 Next에 다시 보낸다.
 *
 * <p>데이터를 기다리는 동안에는 들어가기 전환을 열지 않는다. 열린 전환은 화면을 얼려 버리므로 새 화면이
 * 다 준비된 뒤에 연다. Next의 실험 기능(`experimental.viewTransition`)을 쓰지 않는 이유는 React가 화면
 * 전체 스냅숏(root)을 꺼 버리기 때문이다. 하단탭·앱바까지 한 장으로 밀어야 한 단계 들어간 느낌이 난다.
 */

type Inflight = { dir: NavDirection; captured: Promise<void>; finish: () => void };

// 새 화면이 끝내 커밋되지 않으면(이동 취소 등) 화면이 얼어 있지 않게 이 시간 뒤 전환을 닫는다.
const FINISH_TIMEOUT_MS = 3000;

function openTransition(dir: NavDirection, onCaptured?: () => void): Inflight {
  let markCaptured!: () => void;
  let markDone!: () => void;
  const captured = new Promise<void>((resolve) => (markCaptured = resolve));
  const done = new Promise<void>((resolve) => (markDone = resolve));
  const afterCapture = () => {
    markCaptured();
    onCaptured?.();
  };
  try {
    // 타입을 넘기는 객체 형식은 사파리 18.2부터다. 그보다 오래된 브라우저는 여기서 던지고, 밀지 않는다.
    const transition = document.startViewTransition({
      update: () => {
        afterCapture();
        return done;
      },
      types: [`nav-${dir}`],
    });
    transition.finished.catch(() => {});
  } catch {
    afterCapture();
    markDone();
  }
  const timer = window.setTimeout(markDone, FINISH_TIMEOUT_MS);
  return {
    dir,
    captured,
    finish: () => {
      window.clearTimeout(timer);
      markDone();
    },
  };
}

// 렌더가 다시 불려도 같은 전환을 쓰도록 컴포넌트 밖에 둔다. 전환은 한 번에 하나뿐이다.
// `popped`는 이번 커밋이 히스토리 이동(popstate)에서 왔는지다. 그때는 들어온 길 기록을 덮지 않는다.
const nav: { committed: string | null; inflight: Inflight | null; popped: boolean } = {
  committed: null,
  inflight: null,
  popped: false,
};

function currentKey(): string {
  return `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;
}

/**
 * 새 주소로 렌더될 때, 들어가기가 표시돼 있으면 전환을 열고 「지금 화면을 찍었다」는 약속을 돌려준다.
 * 렌더 중에 전환을 여는 건 의도한 부수효과다 — 데이터가 다 와서 새 화면을 그리기 직전이 스냅숏을
 * 찍을 때이고, 그 시점을 알 수 있는 곳이 렌더뿐이다. 다시 렌더돼도 `nav.inflight`가 같은 전환을 돌려준다.
 */
function captureBeforeCommit(key: string): Promise<void> | null {
  if (nav.committed === null || key === nav.committed) return null;
  if (!nav.inflight) {
    const dir = takePendingNav();
    if (dir) nav.inflight = openTransition(dir);
  }
  // 히스토리 이동의 전환은 popstate에서 이미 찍었다(nav.popped). 동기 렌더라 멈추면 안 된다.
  return nav.inflight && !nav.popped ? nav.inflight.captured : null;
}

function commitKey(key: string) {
  if (!nav.popped) rememberEntry(key, nav.committed);
  nav.popped = false;
  nav.committed = key;
  nav.inflight?.finish();
  nav.inflight = null;
}

function Tracker() {
  const key = `${usePathname()}?${useSearchParams().toString()}`;
  const captured = captureBeforeCommit(key);
  if (captured) use(captured);

  useLayoutEffect(() => commitKey(key), [key]);

  return null;
}

export default function NavTransition() {
  useEffect(() => {
    let replaying = false;
    const onPopState = (event: PopStateEvent) => {
      nav.popped = true;
      if (replaying || nav.inflight || !canAnimateNav()) return;
      // 아이폰의 가장자리 스와이프처럼 브라우저가 이미 자기 애니메이션을 그렸으면 두 번 밀리므로 건너뛴다.
      if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) return;
      // 캡처 단계로 Next(버블 단계)보다 먼저 받는다. 앞으로가기도 여기로 들어오지만 모바일에서 거의 쓰지
      // 않아 가르지 않는다.
      event.stopImmediatePropagation();
      // 위저드에서 나가는 뒤로가기(닫기 포함)는 옆이 아니라 아래로 내려간다.
      nav.inflight = openTransition(isWizardKey(nav.committed) ? "close" : "back", () => {
        replaying = true;
        try {
          window.dispatchEvent(new PopStateEvent("popstate", { state: event.state }));
        } finally {
          replaying = false;
        }
        // 주소가 그대로면(같은 화면 안의 히스토리) 커밋이 오지 않는다. 기다리지 않고 닫는다.
        if (currentKey() === nav.committed) {
          nav.inflight?.finish();
          nav.inflight = null;
          nav.popped = false;
        }
      });
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => window.removeEventListener("popstate", onPopState, { capture: true });
  }, []);

  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
