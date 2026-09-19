"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangeBlock, ExchangeBlockListResponse } from "@/lib/types";

/**
 * 교환 차단 목록(#669).
 *
 * <p>차단은 <b>교환에서만</b> 적용된다. 목록 머리에서 그걸 말해 두지 않으면 판매까지 막힌 것으로
 * 읽힌다 — 실제로 막히지 않는데 막힌 줄 알면 문의로 온다.
 *
 * <p>해제는 회원 id가 아니라 차단 행의 id로 한다. 상대의 회원 id를 클라이언트가 들고 있을
 * 이유가 없다.
 */
function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ExchangeBlocksPage() {
  const router = useRouter();
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [blocks, setBlocks] = useState<ExchangeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      router.replace(`/login?redirect=${encodeURIComponent("/mypage/exchange-blocks")}`);
    }
  }, [authLoading, member, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<ExchangeBlockListResponse>("/api/exchange-blocks");
      setBlocks(res.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "차단 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (authLoading || !member) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 진입에 한 번 불러온다. load는 async라 setState는 await 뒤에 일어난다.
    void load();
  }, [authLoading, member, load]);

  async function unblock(id: number) {
    if (unblocking !== null) return;
    setUnblocking(id);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/exchange-blocks/${id}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "차단을 풀지 못했어요.");
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <>
      <MobilePageHead title="교환 차단 목록" backHref="/mypage" />

      <div className="mx-auto max-w-[640px] pb-16 sm:px-4 sm:py-8">
        <h1 className="hidden px-[14px] pt-2 text-xl font-extrabold tracking-tight text-text-1 sm:block sm:px-0">
          교환 차단 목록
        </h1>

        <p className="bg-surface-2 px-[14px] py-2.5 text-[11.5px] leading-relaxed text-text-2 sm:mt-3 sm:rounded-r2">
          차단은 <b className="font-bold text-text-1">교환에서만</b> 적용돼요. 서로의 교환글이 목록에서 사라지고
          신청도 주고받을 수 없어요. 판매·구매는 막히지 않아요.
        </p>

        {error && (
          <p role="alert" className="mx-[14px] mt-3 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger sm:mx-0">
            {error}
          </p>
        )}

        {loading ? (
          <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">불러오는 중...</p>
        ) : blocks.length === 0 ? (
          <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">차단한 사람이 없어요.</p>
        ) : (
          <ul className="px-[14px] sm:px-0">
            {blocks.map((block) => (
              <li key={block.id} className="flex min-h-14 items-center gap-2.5 border-b border-border last:border-0">
                <div className="min-w-0 flex-1 py-2.5">
                  <p className="text-[14.5px] font-bold text-text-1">{block.nickname ?? "알 수 없음"}</p>
                  <p className="mt-px text-[11.5px] text-text-3">{formatDay(block.blockedAt)} 차단</p>
                </div>
                <button
                  type="button"
                  onClick={() => unblock(block.id)}
                  disabled={unblocking !== null}
                  className={`h-9 flex-shrink-0 rounded-r1 border border-border-2 bg-white px-3.5 text-[13px] font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {unblocking === block.id ? "푸는 중..." : "차단 해제"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
