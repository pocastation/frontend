"use client";

import { useCallback, useEffect, useState } from "react";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { STATUS_TONE_CLASS, StatusGlyph, type StatusTone } from "@/components/StatusIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { NotificationListResponse, NotificationResponse, NotificationType } from "@/lib/types";

// 타입별 표기 — 카테고리 아이콘(공용 StatusIcon) + 의미색 톤.
// 톤: 진행성=primary, 완료·거래 성사=ok(그린), 실패·지연=accent(레드), 종료·취소=중립.
const TYPE_META: Record<NotificationType, { label: string; tone: StatusTone; icon: string }> = {
  // ⚠️ 폐기된 알림이다(§2.3) — 새로 생기지 않는다. 라벨을 남기는 이유는 **과거에 받은 알림이
  // 이 타입으로 저장돼 있기 때문**이다. 지우면 그 행들이 라벨 없이 깨진다(백엔드도 같은 이유로
  // NotificationType.OUTBID enum 값을 남겼다 — 알림 이력은 그 시점의 사실 기록이다).
  OUTBID: { label: "제안 추월", tone: "primary", icon: "trendingUp" },
  AUCTION_WON: { label: "거래 성사", tone: "ok", icon: "award" },
  AUCTION_LOST: { label: "미성사", tone: "neutral", icon: "minus" },
  AUCTION_ENDED_NO_BIDS: { label: "제안 없음", tone: "neutral", icon: "minus" },
  AUCTION_REJECTED: { label: "보완 필요", tone: "accent", icon: "alertCircle" },
  AUCTION_CANCELLED: { label: "판매글 취소", tone: "accent", icon: "xCircle" },
  PAYMENT_COMPLETED: { label: "결제 완료", tone: "ok", icon: "card" },
  PAYMENT_FAILED: { label: "결제 실패", tone: "accent", icon: "alertCircle" },
  ORDER_DEFAULTED: { label: "주문 취소", tone: "neutral", icon: "xCircle" },
  AUCTION_SUCCEEDED: { label: "구매 기회", tone: "primary", icon: "tag" },
  ORDER_SHIPPED: { label: "발송", tone: "primary", icon: "box" },
  ORDER_CONFIRMED: { label: "구매 확정", tone: "ok", icon: "checkCircle" },
  // 조치가 필요한 알림이라 accent다 — 읽고 끝나는 통지가 아니라 사용자가 지금 뭔가 해야 한다.
  DELIVERY_ADDRESS_REQUIRED: { label: "배송지 입력", tone: "accent", icon: "pin" },
  SHIPPING_OVERDUE: { label: "발송 지연", tone: "accent", icon: "clock" },
  SETTLEMENT_COMPLETED: { label: "정산 완료", tone: "ok", icon: "card" },
  INQUIRY_ANSWERED: { label: "문의 답변", tone: "ok", icon: "checkCircle" },
  // ── 상용 BE가 이미 보내는데 여기 없어 UNKNOWN_META(무색 「알림」)로 뜨던 8종(#451).
  //    특히 ORDER_PREPARING은 B3 **필수 고지**인데 회색 폴백으로 묻히고 있었다 —
  //    「이제 취소할 수 없다」는 통지가 시각적으로 가장 조용한 알림이었던 셈이다. ──
  AUCTION_EXTENDED: { label: "기간 연장", tone: "primary", icon: "clock" },
  ORDER_PREPARING: { label: "취소 마감", tone: "accent", icon: "alertCircle" },
  ORDER_REFUNDED: { label: "환불 완료", tone: "ok", icon: "card" },
  RETURN_REQUESTED: { label: "반품 요청", tone: "accent", icon: "alertCircle" },
  RETURN_ACCEPTED: { label: "반품 확정", tone: "accent", icon: "box" },
  // 「반송 도착」이었는데 이 알림은 **구매자가 보냈다**는 뜻이다(#639). 실제 도착 알림
  // (RETURN_DELIVERED)이 생기면서 같은 말이 둘이 됐다.
  RETURN_SHIPPED: { label: "반송 시작", tone: "accent", icon: "box" },
  RETURN_DELIVERED: { label: "도착 확인", tone: "primary", icon: "box" },
  // ⚠️ 값 이름은 옛 용어(UNDER_MEDIATION)지만 라벨에서 「중재」를 쓰지 않는다 — 중재법 §35
  // 효력 오인 방지(BE #494). 값을 바꾸면 DB·서버 분기까지 번져 이름만 남겨 뒀다.
  DISPUTE_UNDER_MEDIATION: { label: "대금 처리 검토", tone: "neutral", icon: "clock" },
  DISPUTE_RESOLVED: { label: "반품 종결", tone: "neutral", icon: "checkCircle" },
  // ── 반품 절차 개편으로 생긴 4종(BE #494) — 전부 인앱 전용 ──
  RETURN_RECEIVED: { label: "반품 접수", tone: "neutral", icon: "checkCircle" },
  RETURN_EVIDENCE_REQUESTED: { label: "자료 보완 요청", tone: "accent", icon: "alertCircle" },
  RETURN_WITHDRAWN: { label: "요청 철회", tone: "neutral", icon: "checkCircle" },
  DISPUTE_REOPENED: { label: "재검토 시작", tone: "accent", icon: "clock" },
  // ── 정책 제21조 공백을 메운 신규 4종(BE 배포 전엔 도착하지 않는다 — 미리 채워 두는 값). ──
  NEW_OFFER: { label: "새 제안", tone: "primary", icon: "tag" },
  AUCTION_APPROVED: { label: "게시 승인", tone: "ok", icon: "checkCircle" },
  AUCTION_EXPIRING: { label: "종료 임박", tone: "accent", icon: "clock" },
  DELIVERY_COMPLETED: { label: "배송 완료", tone: "primary", icon: "box" },
  // ── 포카 교환(BE #522~#534). 전부 인앱 전용이고 auctionId 대신 exchangePostId를 들고 온다. ──
  // 지금 손을 써야 하는 둘만 accent다 — 신청이 왔는데 안 고르면 행사가 그냥 지나가고,
  // 완료 확인은 24시간 안에 아니라고 말하지 않으면 그대로 기록된다.
  EXCHANGE_REQUESTED: { label: "교환 신청", tone: "accent", icon: "tag" },
  EXCHANGE_MATCHED: { label: "교환 확정", tone: "ok", icon: "checkCircle" },
  EXCHANGE_DECLINED: { label: "신청 마감", tone: "neutral", icon: "minus" },
  EXCHANGE_MESSAGE: { label: "새 메시지", tone: "primary", icon: "tag" },
  EXCHANGE_COMPLETED: { label: "완료 확인", tone: "accent", icon: "alertCircle" },
  EXCHANGE_COMPLETION_DISPUTED: { label: "완료 이의", tone: "neutral", icon: "xCircle" },
  EXCHANGE_POST_REMOVED: { label: "교환글 내림", tone: "accent", icon: "xCircle" },
  EXCHANGE_EXPIRED: { label: "교환 마감", tone: "neutral", icon: "clock" },
};

/**
 * 교환 알림이 갈 곳. 전부 교환글로 보내면 이미 확정된 사람이 한 번 더 눌러 들어가야 한다.
 *
 * <p>대화가 열린 뒤의 알림(확정·새 메시지·완료·이의)은 대화로, 신청 도착은 작성자가 고르는
 * 화면으로, 나머지(마감·내림)는 글로 보낸다 — 마감된 건에서 대화를 열면 없는 대화다.
 */
const EXCHANGE_DESTINATION: Partial<Record<NotificationType, (postId: number) => string>> = {
  EXCHANGE_REQUESTED: (id) => `/exchanges/${id}/requests`,
  EXCHANGE_MATCHED: (id) => `/exchanges/${id}/thread`,
  EXCHANGE_MESSAGE: (id) => `/exchanges/${id}/thread`,
  EXCHANGE_COMPLETED: (id) => `/exchanges/${id}/thread`,
  EXCHANGE_COMPLETION_DISPUTED: (id) => `/exchanges/${id}/thread`,
};

// 배포 시점 차이로 프론트가 모르는 타입이 와도 렌더가 깨지지 않게 폴백.
const UNKNOWN_META: { label: string; tone: StatusTone; icon: string } = { label: "알림", tone: "neutral", icon: "minus" };

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const { refresh: refreshBell } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth<NotificationListResponse>(
        `/api/members/me/notifications?page=0&size=${PAGE_SIZE}`,
      );
      setNotifications(res.content);
      setPage(0);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // 다음 페이지를 이어붙인다(기존 목록 유지 — AuctionBrowser와 같은 "더 보기" 패턴).
  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchWithAuth<NotificationListResponse>(
        `/api/members/me/notifications?page=${nextPage}&size=${PAGE_SIZE}`,
      );
      setNotifications((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/notifications");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 알림함을 동기화한다.
    void load();
  }, [accessToken, isLoading, load, router]);

  const hasUnread = notifications.some((n) => !n.isRead);

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetchWithAuth<void>("/api/members/me/notifications/read-all", { method: "PATCH" });
    } catch {
      await load();
    } finally {
      refreshBell();
    }
  }

  // 알림 클릭 — 읽음 처리 후 연결된 매물로 이동. 읽음 API 실패는 이동을 막지 않는다(뱃지만 지연 반영).
  async function handleClick(notification: NotificationResponse) {
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      try {
        await fetchWithAuth<void>(`/api/members/me/notifications/${notification.id}/read`, { method: "PATCH" });
      } catch {
        // 무시 — 다음 조회에서 서버 상태로 보정된다.
      } finally {
        refreshBell();
      }
    }
    if (notification.type === "INQUIRY_ANSWERED") {
      router.push("/inquiries");
      return;
    }
    // 배송지 입력은 매물 상세가 아니라 구매 내역에서 한다 — 상품 페이지로 보내면
    // "입력하라"는 알림을 받고 입력할 곳이 없는 화면에 도착한다.
    // 마이페이지에 들어가면 미입력 주문의 배송지 팝업이 자동으로 열린다.
    if (notification.type === "DELIVERY_ADDRESS_REQUIRED") {
      router.push("/mypage?tab=purchases");
      return;
    }
    // 교환 알림은 auctionId가 비어 있다. 이 분기가 없으면 눌러도 아무 데도 가지 않는다.
    if (notification.exchangePostId != null) {
      const to = EXCHANGE_DESTINATION[notification.type];
      router.push(to ? to(notification.exchangePostId) : `/exchanges/${notification.exchangePostId}`);
      return;
    }
    if (notification.auctionId != null) {
      router.push(`/auctions/${notification.auctionId}`);
    }
  }

  if (isLoading || !accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">알림을 불러오는 중...</div>
    );
  }

  /*
    데스크탑 헤더와 모바일 앱바가 같은 버튼을 쓴다 — 한쪽만 고쳐 동작이 갈리는 일을 막는다.

    안읽음이 0이어도 버튼을 지우지 않고 비활성으로 둔다(#560). 사라지던 시점이 하필 「방금 알림을
    누른 뒤」였다 — 목록에서 탭하면 읽음 처리되고 관련 화면으로 넘어가므로, 몇 개 보고 돌아오면
    버튼이 없어져 있다. 도구가 인과 없이 사라지면 사용자는 자기가 잘못 본 것으로 받아들인다.
  */
  const markAllReadButton = (
    <button
      type="button"
      onClick={handleMarkAllRead}
      disabled={!hasUnread}
      className={`shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold transition-colors ${FOCUS_RING} ${
        hasUnread
          ? "border border-border-2 text-text-2 hover:border-primary hover:text-primary"
          : "cursor-not-allowed border border-border text-text-3"
      }`}
    >
      모두 읽음
    </button>
  );

  return (
    <>
      {/* 모바일은 상단바의 종이 데려오는 서브 화면이다 — 앱바가 제목을 갖고, 본문은 제목을 반복하지 않는다. */}
      <MobilePageHead title="알림" action={markAllReadButton} />
      <div className="mx-auto max-w-[720px] px-0 py-0 sm:px-4 sm:py-10">
        <div className="mb-6 hidden items-end justify-between gap-3 sm:flex">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">알림</h1>
            <p className="mt-1.5 text-sm text-text-3">거래 소식을 모아봐요.</p>
          </div>
          {markAllReadButton}
        </div>

        {error && (
          <p role="alert" className="mx-4 mb-4 mt-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent sm:mx-0 sm:mt-0">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-text-3">불러오는 중...</p>
        ) : notifications.length === 0 ? (
          <div className="mx-4 mt-4 flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-20 text-center text-text-3 sm:mx-0 sm:mt-0">
            <BellIcon />
            <p className="text-sm font-bold text-text-2">아직 받은 알림이 없어요.</p>
            <p className="text-xs">거래 성사·결제·발송 소식을 여기서 받아볼 수 있어요.</p>
          </div>
        ) : (
          // 승인 시안 B — 카테고리 리딩 아이콘(의미색 톤) + 안읽음은 우측 단일 닷. 읽음 행은 배경·아이콘을 가라앉힌다.
          <ul className="sm:overflow-hidden sm:rounded-r3 sm:border sm:border-border">
            {notifications.map((notification) => {
              const meta = TYPE_META[notification.type] ?? UNKNOWN_META;
              const unread = !notification.isRead;
              return (
                <li key={notification.id} className="border-b border-border/60 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => handleClick(notification)}
                    // 세 줄까지 늘어나는 본문에 맞춰 위쪽 정렬이다(#557). 가운데 정렬이면 긴 알림에서
                    // 아이콘과 안읽음 닷이 본문 한가운데에 떠 어느 줄에 걸린 표시인지 읽히지 않는다.
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2/60 ${FOCUS_RING} ${
                      unread ? "bg-surface" : "bg-surface-2/40"
                    }`}
                  >
                    <span
                      className={`mt-px flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[20px] ${STATUS_TONE_CLASS[meta.tone]} ${unread ? "" : "opacity-70"}`}
                      aria-label={meta.label}
                    >
                      <StatusGlyph name={meta.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-bold text-text-1" : "text-text-2"}`}>
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-text-3">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                      {/*
                        세 줄까지 편다(#557). 한 줄로 자르던 시절엔 알림 21종 중 한 줄에 들어가는 것이
                        하나도 없었다 — 375px에서 26자까지 들어가는데 문구 중앙값이 39자다. 다 읽으려고
                        탭하면 관련 화면으로 넘어가 버려서 본문을 끝까지 읽을 경로가 없었다.

                        두 줄이 아닌 이유는 남는 셋이 하필 자동 구매확정 3일·자동 환불 3영업일·
                        미결제 제재 7일이어서다. 분쟁 소재가 되는 값이라 화면에서 빼지 않는다.
                      */}
                      <span className={`mt-0.5 line-clamp-3 text-[13px] leading-relaxed ${unread ? "text-text-2" : "text-text-3"}`}>
                        {notification.message}
                      </span>
                    </span>
                    {unread && <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="mb-6 mt-5 flex justify-center sm:mb-0">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`rounded-full border border-border-2 bg-white px-5 py-2 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          </div>
        )}

        <p className="mt-6 hidden text-center text-xs text-text-3 sm:block">
          <Link href="/mypage" className={`font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
            마이페이지로 돌아가기 →
          </Link>
        </p>
      </div>
    </>
  );
}
