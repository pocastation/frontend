"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isClosed } from "@/lib/exchange-labels";
import { FOCUS_RING, PRESS_ACCENT, PRESS_FADE, PRESS_INK, PRESS_OUTLINE, PRESS_PRIMARY } from "@/lib/ui";
import type { ExchangePostDetail, ExchangeStatus, ExchangeViewer } from "@/lib/types";

const BUTTON = "flex h-12 w-full items-center justify-center rounded-[7px] text-[15px] font-extrabold";

/**
 * 교환글 하단 버튼. <b>자리는 하나고 역할로 갈린다.</b>
 *
 * <p>클라이언트에서 상세를 다시 부른다. 상세 페이지는 서버 컴포넌트라 사용자 토큰이 없고,
 * 역할 판정에 필요한 {@code viewer}는 로그인해야 채워진다.
 *
 * <p>역할을 서버가 판정한 값 하나로 읽는다. 화면이 「대화를 열어 보고 403이면 당사자가 아니다」
 * 식으로 알아내면 권한 오류와 진짜 오류가 섞이고, 화면 한 장에 실패하는 요청이 붙는다.
 */
export default function ExchangeCta({
  postId,
  status,
  eventId,
  expiresAt,
}: {
  postId: number;
  status: ExchangeStatus;
  eventId: number;
  expiresAt: string;
}) {
  const { accessToken, fetchWithAuth, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [viewer, setViewer] = useState<ExchangeViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setViewer(null);
      setLoading(false);
      return;
    }
    try {
      const detail = await fetchWithAuth<ExchangePostDetail>(`/api/exchanges/${postId}`);
      setViewer(detail.viewer);
    } catch {
      // 역할을 모르면 아무것도 걸지 않은 사람으로 둔다. 버튼이 사라지는 것보다 낫다.
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, fetchWithAuth, postId]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 진입에 한 번 불러온다. load는 async라 setState는 await 뒤에 일어난다.
    void load();
  }, [authLoading, load]);

  async function withdraw() {
    if (!viewer?.myRequestId || withdrawing) return;
    setWithdrawing(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/exchange-requests/${viewer.myRequestId}/withdraw`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신청 취소에 실패했어요.");
    } finally {
      setWithdrawing(false);
    }
  }

  // 자리를 비워 두지 않는다. 로딩 중에 버튼이 없다가 생기면 화면이 튄다.
  if (authLoading || loading) {
    return <div aria-hidden="true" className="h-12 w-full rounded-[7px] bg-surface-2" />;
  }

  /*
    마감은 status가 아니라 시각으로 본다. 만료 스위퍼가 돌기 전까지 마감된 글도 status는
    OPEN이라, status만 보면 버튼이 남아 사진까지 올린 뒤에 서버가 거절한다(#690).

    안내로 끝내지 않고 같은 행사로 돌아갈 자리를 함께 둔다 — 마감을 알리면서 다음 걸음을
    주지 않으면 그 사용자는 뒤로가기밖에 할 것이 없다.
  */
  const closedNotice = (
    <div className="rounded-[7px] bg-surface-2 px-3 py-3 text-center">
      <p className="text-[13px] font-semibold text-text-2">마감된 교환글이에요.</p>
      <Link
        href={`/events/${eventId}`}
        className={`mt-1 inline-block text-[12.5px] font-bold text-primary ${PRESS_FADE} ${FOCUS_RING}`}
      >
        같은 행사의 다른 교환글 보기
      </Link>
    </div>
  );
  const closed = isClosed(expiresAt);

  if (!accessToken) {
    // 마감 확인이 로그인 유도보다 앞선다. 유입이 가장 많은 자리라, 여기서 로그인시켜 놓고
    // 다음 화면에서 막으면 두 번 헛걸음이 된다.
    if (closed) return closedNotice;
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname)}`}
        className={`${BUTTON} bg-primary text-white ${PRESS_PRIMARY} ${FOCUS_RING}`}
      >
        로그인하고 신청하기
      </Link>
    );
  }

  if (viewer?.participant) {
    // 먹색이다. 나머지는 이 글에 무언가를 거는 일이고, 대화는 이미 정해진 약속으로 들어가는 일이다.
    return (
      <Link href={`/exchanges/${postId}/thread`} className={`${BUTTON} bg-text-1 text-white ${PRESS_INK} ${FOCUS_RING}`}>
        대화 열기
      </Link>
    );
  }

  if (viewer?.author) {
    const count = viewer.receivedRequestCount ?? 0;
    return (
      <Link
        href={`/exchanges/${postId}/requests`}
        className={`${BUTTON} gap-1.5 border border-primary bg-white text-primary ${PRESS_ACCENT} ${FOCUS_RING}`}
      >
        받은 신청
        {count > 0 && (
          <span className="min-w-5 rounded-full bg-primary px-1.5 py-px text-[11.5px] font-extrabold text-white">
            {count}
          </span>
        )}
      </Link>
    );
  }

  if (viewer?.myRequestStatus === "PENDING") {
    return (
      <>
        <button
          type="button"
          onClick={withdraw}
          disabled={withdrawing}
          className={`${BUTTON} border border-border-2 bg-white text-text-2 disabled:opacity-60 ${PRESS_OUTLINE} ${FOCUS_RING}`}
        >
          {withdrawing ? "취소하는 중..." : "신청함 · 취소하기"}
        </button>
        {error && (
          <p role="alert" className="pt-2 text-center text-[11.5px] font-semibold text-danger">{error}</p>
        )}
      </>
    );
  }

  // 차단은 버튼을 남겨 두지 않는다. 눌렀을 때 400을 보여주면 왜 안 되는지 알 수 없다.
  if (viewer?.blocked) {
    return (
      <p className="rounded-[7px] bg-surface-2 px-3 py-3.5 text-center text-[13px] font-semibold text-text-2">
        차단한 상대의 교환글이에요. 마이페이지에서 차단을 풀 수 있어요.
      </p>
    );
  }

  // 작성자·당사자·신청자 분기를 지나온 사람만 여기 닿는다. 그들에게는 마감이 「신청할 수
  // 있는가」의 답이므로 status보다 앞에서 답한다.
  if (closed) return closedNotice;

  if (status !== "OPEN") {
    return (
      <p className="rounded-[7px] bg-surface-2 px-3 py-3.5 text-center text-[13px] font-semibold text-text-2">
        지금은 신청을 받지 않는 교환글이에요.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push(`/exchanges/${postId}/apply`)}
      className={`${BUTTON} bg-primary text-white ${PRESS_PRIMARY} ${FOCUS_RING}`}
    >
      교환 신청하기
    </button>
  );
}
