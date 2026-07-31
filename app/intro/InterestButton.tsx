"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";

// 이미 눌렀는지 기억하는 키. 서버는 개인 식별자를 저장하지 않아(집계만) 중복을 알아볼 수 없으므로,
// 같은 사람이 새로고침할 때마다 숫자가 오르는 걸 여기서 막는다. 우회는 가능하지만
// 이건 어뷰징 차단이 아니라 **선의의 중복**을 줄이는 장치다(악의적 연타는 서버 rate limit이 맡는다).
const STORAGE_KEY = "pocastation.preRegistered";

type State = "idle" | "sending" | "done" | "error";

export default function InterestButton() {
  // 유입 경로(?source=instagram 등)를 여기서 읽는다. 서버 컴포넌트의 searchParams로 받으면
  // 페이지 전체가 동적 렌더링으로 내려가 캐시가 안 된다 — 홍보 랜딩은 트래픽이 몰릴 수 있어
  // 페이지는 정적으로 두고 경로 파싱만 이 아일랜드가 맡는다.
  const source = useSearchParams().get("source") ?? undefined;
  const [state, setState] = useState<State>("idle");

  // localStorage는 서버에 없으므로 마운트 후에 읽는다(SSR 초기값으로 읽으면 하이드레이션이 어긋난다).
  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 마운트 후에만 읽을 수 있다.
      setState("done");
    }
  }, []);

  async function submit() {
    if (state === "sending" || state === "done") return;
    setState("sending");
    try {
      const query = source ? `?source=${encodeURIComponent(source)}` : "";
      await apiFetch<void>(`/api/pre-registrations${query}`, { method: "POST" });
      window.localStorage.setItem(STORAGE_KEY, "1");
      setState("done");
    } catch {
      // 실패해도 사용자가 할 수 있는 일이 없다 — 다시 눌러볼 수 있게 idle로 되돌리고 안내만 한다.
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="inline-flex items-center gap-2 rounded-r2 border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          관심 표시 완료 — 오픈하면 알려드릴게요
        </p>
        <p className="text-xs" style={{ color: "#c8bcff" }}>
          지금도 진행 중인 경매를 둘러볼 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <button
        type="button"
        onClick={submit}
        disabled={state === "sending"}
        className={`inline-flex h-12 items-center justify-center rounded-r2 bg-primary px-7 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace ${FOCUS_RING}`}
      >
        {state === "sending" ? "보내는 중..." : "관심 있어요"}
      </button>
      <p className="text-xs" aria-live="polite" style={{ color: state === "error" ? "#ffb4b4" : "#c8bcff" }}>
        {state === "error"
          ? "잠시 후 다시 눌러주세요."
          : "이름·이메일·연락처를 받지 않아요. 관심 수만 세요."}
      </p>
    </div>
  );
}
