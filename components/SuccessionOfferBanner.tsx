"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST, formatKRW } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { SuccessionOfferResponse } from "@/lib/types";

// 차순위 승계 제안 배너(§7-3, backend #106). 낙찰(ENDED_SOLD) 상세에서 제안 대상자 본인에게만
// 노출된다 — GET이 대상자에게만 200을 주므로(타인 404) 조회 성공 자체가 노출 게이트다.
// 수락하면 등록 카드로 자동 결제(없으면 마이페이지에서 등록 → 자동 재개)되고 재낙찰이 반영된다.
export default function SuccessionOfferBanner({ auctionId }: { auctionId: number }) {
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const [offer, setOffer] = useState<SuccessionOfferResponse | null>(null);
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<SuccessionOfferResponse>(
        `/api/members/me/succession-offers/${auctionId}`,
      );
      // 응답 대기 중(OFFERED)인 제안만 배너로 띄운다 — 이미 처리/만료된 건 숨긴다.
      if (res.status === "OFFERED") setOffer(res);
    } catch {
      // 404(대상자 아님)·기타 실패는 조용히 배너를 감춘다.
    }
  }, [fetchWithAuth, auctionId]);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 내 제안 1회 조회.
    void load();
  }, [accessToken, isLoading, load]);

  async function respond(action: "accept" | "decline") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<SuccessionOfferResponse>(
        `/api/auctions/${auctionId}/succession-offer/${action}`,
        { method: "POST" },
      );
      setOutcome(action === "accept" ? "accepted" : "declined");
      // 수락은 재낙찰(낙찰자·체결가 변경)을 서버 컴포넌트에서 다시 읽어와 반영한다.
      if (action === "accept") router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
      // 만료·이미 처리(409)면 배너를 접어 최신 상태를 반영한다.
      if (err instanceof ApiError && err.status === 409) setOffer(null);
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken) return null;

  // 처리 결과 안내(수락/거절) — 배너를 결과 카드로 전환.
  if (outcome === "accepted") {
    return (
      <div className="mt-4 rounded-r3 border border-border bg-surface-2/50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-text-1">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          구매를 수락했어요
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">
          등록된 카드로 자동 결제돼요. 결제수단이 없다면{" "}
          <Link href="/mypage?tab=payment" className={`font-bold text-primary hover:underline ${FOCUS_RING}`}>
            마이페이지에서 카드를 등록
          </Link>
          하면 자동으로 결제됩니다.
        </p>
      </div>
    );
  }
  if (outcome === "declined") {
    return (
      <div className="mt-4 rounded-r3 border border-border bg-surface-2/50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-text-1">
          <span className="h-1.5 w-1.5 rounded-full bg-text-3" aria-hidden="true" />
          구매를 거절했어요
        </p>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="mt-4 rounded-r3 border border-primary/25 bg-primary-soft/30 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-text-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        구매 기회가 왔어요
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">
        이전 낙찰자의 미결제로 회원님께 차례가 왔어요.{" "}
        <b className="font-bold text-text-1">{formatKRW(offer.amount)}</b>에 구매할 수 있어요.
      </p>
      <p className="mt-1 text-[12px] text-text-3">
        {formatDateTimeKST(offer.expiresAt)}까지 응답하지 않으면 제안이 만료돼요.
      </p>

      {error && (
        <p role="alert" className="mt-2.5 text-[12px] font-semibold text-accent">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={busy}
          className={`rounded-r2 bg-text-1 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
        >
          구매 수락
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={busy}
          className={`rounded-r2 border border-border-2 bg-surface px-4 py-2 text-[13px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
        >
          거절
        </button>
      </div>
    </div>
  );
}
