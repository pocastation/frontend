"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/ui";
import type { MypageTab } from "@/lib/mypage-tabs";

/**
 * 모바일 마이 — 메뉴 목록 화면(디자인 시스템 킷 `MyPage`).
 *
 * <p>데스크탑은 좌 사이드바 240px + 우 콘텐츠로 <b>한 화면</b>이지만, 모바일은 커머스 앱 문법대로
 * 목록이 먼저다: 프로필 줄 → 숫자 4칸 → (조치가 필요하면) 알림 블록 → 8px 회색 띠로 나뉜 그룹별 행.
 * 행을 누르면 `?tab=X`가 서브 화면으로 열리고 앱바 뒤로가 이 목록으로 돌아온다.
 *
 * <p><b>탭 콘텐츠는 복제하지 않는다.</b> 이 컴포넌트가 갖는 건 내비게이션뿐이고, 눌렀을 때 열리는
 * 본문은 데스크탑과 같은 트리를 그대로 쓴다.
 */
export type MypageMenuCounts = {
  liveBidding: number;
  bidding: number;
  won: number;
  purchases: number;
  selling: number;
  sellHistory: number;
  wishlist: number;
};

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// 행 하나. 값(회색 숫자)은 "얼마나 있는지", 배지(빨강)는 "지금 손봐야 하는 건수"다 — 둘을 같은
// 색으로 두면 배지가 그냥 개수로 읽힌다.
function RowShell({
  label,
  value,
  badge,
  last,
}: {
  label: string;
  value?: string;
  badge?: number;
  last?: boolean;
}) {
  return (
    <span className={`flex min-h-[50px] w-full items-center justify-between gap-2.5 px-[14px] text-left ${last ? "" : "border-b border-border"}`}>
      <span className="text-sm text-text-1">{label}</span>
      <span className="inline-flex items-center gap-1.5">
        {badge ? (
          <span className="rounded-[3px] bg-danger px-1.5 py-px text-[10.5px] font-extrabold tabular-nums text-white">{badge}</span>
        ) : null}
        {value && <span className="text-[13px] tabular-nums text-text-3">{value}</span>}
        <span className="inline-flex text-border-2">
          <Chevron />
        </span>
      </span>
    </span>
  );
}

function TabRow({
  label,
  value,
  badge,
  last,
  onClick,
}: {
  label: string;
  value?: string;
  badge?: number;
  last?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`block w-full ${FOCUS_RING}`}>
      <RowShell label={label} value={value} badge={badge} last={last} />
    </button>
  );
}

function LinkRow({ label, href, last }: { label: string; href: string; last?: boolean }) {
  return (
    <Link href={href} className={`block w-full ${FOCUS_RING}`}>
      <RowShell label={label} last={last} />
    </Link>
  );
}

// 그룹 사이 8px 회색 띠 — 선 하나로 나누면 열두 줄이 한 덩어리로 읽힌다.
function Band() {
  return <div aria-hidden="true" className="h-2 bg-surface-2" />;
}

function GroupHead({ children }: { children: ReactNode }) {
  return <h2 className="px-[14px] pb-2 pt-4 text-[13px] font-extrabold text-text-3">{children}</h2>;
}

function Group({ children }: { children: ReactNode }) {
  return <div className="border-y border-border">{children}</div>;
}

export default function MobileMypageMenu({
  nickname,
  trustLevel,
  trustLevelLabel,
  tradeCount,
  counts,
  purchaseActionCount,
  shipmentActionCount,
  pendingAddress,
  onSelectTab,
  onOpenAddress,
  onLogout,
}: {
  nickname: string;
  trustLevel: number | null;
  trustLevelLabel: string | null;
  tradeCount: number | null;
  counts: MypageMenuCounts;
  /** 구매 건 중 지금 내 조치가 필요한 수(배송지 미입력·결제 대기). */
  purchaseActionCount: number;
  /** 판매 건 중 발송이 필요한 수. */
  shipmentActionCount: number;
  /** 배송지가 비어 있는 결제완료 주문 — 있으면 목록보다 먼저 세운다. */
  pendingAddress: { auctionId: number; title: string } | null;
  onSelectTab: (tab: MypageTab) => void;
  onOpenAddress: (auctionId: number, title: string) => void;
  onLogout: () => void;
}) {
  // 숫자 4칸 — 대시보드 통계와 같은 값이지만 여기서는 "바로 가는 문"으로 쓴다.
  const quick: { label: string; value: number; tab: MypageTab }[] = [
    { label: "제안 중", value: counts.liveBidding, tab: "bidding" },
    { label: "성사", value: counts.won, tab: "purchases" },
    { label: "판매 중", value: counts.selling, tab: "selling" },
    { label: "찜", value: counts.wishlist, tab: "wishlist" },
  ];

  return (
    <div className="pb-6 sm:hidden">
      <button
        type="button"
        onClick={() => onSelectTab("profile")}
        className={`flex w-full items-center gap-3 px-[14px] py-4 text-left ${FOCUS_RING}`}
      >
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-extrabold text-primary">
          {nickname.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-base font-extrabold text-text-1">{nickname}</span>
            {trustLevel != null && (
              <span className="flex-shrink-0 whitespace-nowrap rounded-[3px] border border-border-2 px-1.5 py-px text-[10.5px] font-extrabold text-text-2">
                {trustLevelLabel ?? `신뢰 ${trustLevel}`}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs tabular-nums text-text-3">거래 {tradeCount ?? 0}회</span>
        </span>
        <span className="inline-flex text-border-2">
          <Chevron size={16} />
        </span>
      </button>

      <nav aria-label="내 활동" className="grid grid-cols-4 border-y border-border">
        {quick.map(({ label, value, tab }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`flex min-h-[66px] flex-col items-center justify-center gap-0.5 ${i ? "border-l border-border" : ""} ${FOCUS_RING}`}
          >
            <span className="font-display text-lg font-extrabold tabular-nums text-text-1">{value}</span>
            <span className="text-[11.5px] text-text-3">{label}</span>
          </button>
        ))}
      </nav>

      {/* 지금 손봐야 하는 일이 있을 때만 나온다 — 없으면 이 블록 자체가 렌더되지 않는다. */}
      {pendingAddress && (
        <div className="px-[14px] pt-3">
          <button
            type="button"
            onClick={() => onOpenAddress(pendingAddress.auctionId, pendingAddress.title)}
            className={`flex w-full items-center gap-2.5 rounded-r2 border border-danger bg-danger-soft px-3 py-[11px] text-left ${FOCUS_RING}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold text-danger">배송지를 입력해 주세요</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-text-2">{pendingAddress.title} · 결제 완료</span>
            </span>
            <span className="flex-shrink-0 rounded-r1 bg-danger px-2.5 py-1.5 text-xs font-extrabold text-white">입력</span>
          </button>
        </div>
      )}

      <GroupHead>구매</GroupHead>
      <Group>
        <TabRow label="제안 내역" value={`${counts.bidding}건`} onClick={() => onSelectTab("bidding")} />
        <TabRow label="구매 내역" value={`${counts.purchases}건`} badge={purchaseActionCount} onClick={() => onSelectTab("purchases")} />
        <TabRow label="찜한 상품" value={`${counts.wishlist}개`} onClick={() => onSelectTab("wishlist")} last />
      </Group>

      <Band />
      <GroupHead>판매</GroupHead>
      <Group>
        <TabRow label="판매 중인 매물" value={`${counts.selling}건`} onClick={() => onSelectTab("selling")} />
        <TabRow label="판매 내역" value={`${counts.sellHistory}건`} badge={shipmentActionCount} onClick={() => onSelectTab("sellHistory")} />
        <TabRow label="정산 계좌" onClick={() => onSelectTab("settlement")} last />
      </Group>

      <Band />
      <GroupHead>계정</GroupHead>
      <Group>
        <TabRow label="내 정보" onClick={() => onSelectTab("profile")} />
        <TabRow label="배송지 관리" onClick={() => onSelectTab("shipping")} />
        <TabRow label="계정 설정" onClick={() => onSelectTab("settings")} />
        <LinkRow label="문의하기" href="/inquiries" />
        <LinkRow label="공지사항" href="/notices" />
        <LinkRow label="이용약관" href="/terms" />
        <LinkRow label="개인정보 처리방침" href="/privacy" last />
      </Group>

      <div className="px-[14px] pt-6">
        <button
          type="button"
          onClick={onLogout}
          className={`flex h-11 w-full items-center justify-center rounded-r1 border border-border-2 text-[13px] font-bold text-text-2 ${FOCUS_RING}`}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
