"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError, apiFetch, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { itemDetail, itemName, slotLabel } from "@/lib/exchange-labels";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangePostDetail, ExchangeRequestItem, ExchangeRequestListResponse } from "@/lib/types";

/**
 * 받은 신청(#666). 교환글 작성자만 본다 — 권한은 서버가 본다.
 *
 * <p><b>고르면 되돌릴 수 없다.</b> 한 명을 고르는 순간 나머지가 자동 거절되고 그 사람들에게
 * 알림이 간다. 목록 맨 위에서 먼저 말해 둔다 — 누른 뒤에 알려주는 것은 알려주는 것이 아니다.
 *
 * <p>버튼 색은 첫 카드만 보라다. 전부 보라면 무엇을 고를지가 아니라 몇 개를 고를지로 읽힌다.
 */
export default function ExchangeRequestsPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [post, setPost] = useState<ExchangePostDetail | null>(null);
  const [requests, setRequests] = useState<ExchangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      router.replace(`/login?redirect=${encodeURIComponent(`/exchanges/${postId}/requests`)}`);
    }
  }, [authLoading, member, postId, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<ExchangeRequestListResponse>(`/api/exchanges/${postId}/requests`);
      setRequests(res.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "받은 신청을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, postId]);

  useEffect(() => {
    if (authLoading || !member) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 진입에 한 번 불러온다. load는 async라 setState는 await 뒤에 일어난다.
    void load();
  }, [authLoading, member, load]);

  useEffect(() => {
    apiFetch<ExchangePostDetail>(`/api/exchanges/${postId}`, { cache: "no-store" })
      .then(setPost)
      .catch(() => setPost(null));
  }, [postId]);

  async function accept(requestId: number) {
    if (accepting !== null) return;
    setAccepting(requestId);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/exchange-requests/${requestId}/accept`, { method: "POST" });
      // 확정되면 이 화면에 더 있을 이유가 없다. 약속을 다듬는 대화가 다음 걸음이다.
      router.replace(`/exchanges/${postId}/thread`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수락에 실패했어요.");
      setAccepting(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const alreadySettled = pending.length === 0 && requests.length > 0;

  return (
    <>
      <MobilePageHead
        title="받은 신청"
        sub={post ? `${pending.length}건 · ${post.place}` : undefined}
        backHref={`/exchanges/${postId}`}
      />

      <div className="mx-auto max-w-[640px] pb-16 sm:px-4 sm:py-8">
        {pending.length > 0 && (
          <p className="bg-surface-2 px-[14px] py-2.5 text-[11.5px] leading-relaxed text-text-2 sm:rounded-r2">
            한 명을 고르면 교환이 확정되고 <b className="font-bold text-text-1">나머지 신청은 자동으로 마감</b>돼요.
            고른 분과는 대화가 열려요.
          </p>
        )}

        {error && (
          <p role="alert" className="mx-[14px] mt-3 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger sm:mx-0">
            {error}
          </p>
        )}

        {loading ? (
          <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">불러오는 중...</p>
        ) : requests.length === 0 ? (
          <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">아직 받은 신청이 없어요.</p>
        ) : alreadySettled ? (
          <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">
            이미 교환이 확정됐어요. 대화에서 약속을 이어가 주세요.
          </p>
        ) : (
          <div className="px-[14px] sm:px-0">
            {pending.map((request, index) => (
              <article key={request.id} className="border-b border-border py-3.5 last:border-0">
                <div className="flex items-start gap-2.5">
                  {request.photos.length > 0 && (
                    <div className="flex flex-shrink-0 gap-1">
                      {request.photos.slice(0, 2).map((photo) => (
                        <span key={photo.url} className="block h-16 w-[54px] overflow-hidden rounded-[4px] border border-border bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
                          <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-extrabold tracking-[-0.015em] text-text-1">{itemName(request.offer)}</p>
                    <p className="mt-px text-[11.5px] text-text-3">{itemDetail(request.offer)}</p>
                    <p className="mt-1.5 text-xs font-bold text-text-2">
                      {request.requesterNickname ?? "알 수 없음"}
                      {request.slot && ` · ${slotLabel(request.slot)}`}
                    </p>
                  </div>
                </div>

                {request.message && (
                  <p className="mt-2 text-[13px] leading-relaxed text-text-2">{request.message}</p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-3">{formatRelativeTime(request.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => accept(request.id)}
                    disabled={accepting !== null}
                    className={`h-10 min-w-[88px] rounded-r1 px-5 text-sm font-extrabold disabled:opacity-60 ${
                      index === 0 ? "bg-primary text-white" : "border border-border-2 bg-white text-text-2"
                    } ${FOCUS_RING}`}
                  >
                    {accepting === request.id ? "확정 중..." : "선택"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
