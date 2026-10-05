"use client";

import Link from "next/link";
import { markNavForward } from "@/lib/nav-transition";
import TrustLevelBadge from "@/components/TrustLevelBadge";
import type { ReactNode } from "react";
import { FOCUS_RING, PRESS_ROW, PRESS_FADE, LABEL_STRONG } from "@/lib/ui";
import type { MypageTab } from "@/lib/mypage-tabs";
import { SUPPORT_LINKS } from "@/lib/mypage-tabs";

/**
 * 모바일 마이 — 메뉴 목록 화면(디자인 시스템 킷 `MyPage`).
 *
 * <p>데스크탑은 좌 사이드바 240px + 우 콘텐츠로 <b>한 화면</b>이지만, 모바일은 커머스 앱 문법대로
 * 목록이 먼저다: 프로필 줄 → 숫자 4칸 → (조치가 필요하면) 알림 블록 → 그룹별 메뉴.
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

function Chevron({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// 전체 건수와 조치가 필요한 건수는 구분한다. 배지는 기존 조치 건수를 그대로 표시한다.
function RowShell({
  label,
  value,
  badge,
  unit = "건",
}: {
  label: string;
  value?: number;
  badge?: number;
  unit?: string;
}) {
  return (
    <span className="flex min-h-[49px] w-full items-center justify-between gap-2 text-left">
      <span className="text-body-l font-medium text-text-1">{label}</span>
      <span className="inline-flex shrink-0 items-center gap-2">
        {badge ? (
          <span aria-label={`확인이 필요한 항목 ${badge}건`} className={`${LABEL_STRONG} tabular-nums`}>새 소식 {badge}</span>
        ) : null}
        {value != null && <span className="text-body font-semibold tabular-nums text-text-1">{value}<span className="ml-1 text-label font-normal text-text-2">{unit}</span></span>}
        <span className="inline-flex text-text-3">
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
  unit,
  onClick,
}: {
  label: string;
  value?: number;
  badge?: number;
  unit?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`block w-full rounded-control ${PRESS_ROW} ${FOCUS_RING}`}>
      <RowShell label={label} value={value} badge={badge} unit={unit} />
    </button>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} onNavigate={markNavForward} className={`block w-full rounded-control ${PRESS_ROW} ${FOCUS_RING}`}>
      <RowShell label={label} />
    </Link>
  );
}

function GroupHead({ children }: { children: ReactNode }) {
  return <h2 className="pb-2 pt-section-ruled text-body-s font-semibold text-text-2">{children}</h2>;
}

function Group({ children }: { children: ReactNode }) {
  return <div className="border-b border-border pb-section-ruled">{children}</div>;
}

export default function MobileMypageMenu({
  isAdmin = false,
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
  isAdmin?: boolean;
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
    <div className="px-gutter pb-6 pt-page sm:hidden">
      {/*
        button이 아니라 role="button"인 div다(#566). 이 행 안에 거래 레벨 배지(TrustLevelBadge)가
        있고 그 배지는 시트를 여는 button이라, 행까지 button이면 button 안에 button이 된다 —
        HTML이 금지하는 중첩이라 React가 하이드레이션 오류를 내고, 브라우저마다 안쪽 클릭 전달이
        다르다. 배지의 onClick이 stopPropagation을 하므로 행 클릭과 배지 클릭은 섞이지 않는다.
        포털로 열린 칭호 시트의 클릭도 React 트리로 전달되므로 DOM 안의 클릭만 이동시킨다.
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (event.currentTarget.contains(event.target as Node)) onSelectTab("profile");
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return; // 배지에서 올라온 키 입력은 배지 몫이다.
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectTab("profile");
          }
        }}
        className={`flex w-full cursor-pointer items-center gap-3 text-left ${PRESS_FADE} ${FOCUS_RING}`}
      >
        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-title font-semibold text-primary">
          {nickname.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title-s font-semibold text-text-1">{nickname}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-label text-text-2">
            {trustLevel != null && (
              <TrustLevelBadge
                level={trustLevel}
                className="shrink-0 whitespace-nowrap rounded-control border border-border-2 px-2 py-px text-caption font-bold text-text-2 no-underline"
              >
                {trustLevelLabel ?? `신뢰 ${trustLevel}`}
              </TrustLevelBadge>
            )}
            {trustLevel != null && <span aria-hidden="true">·</span>}
            <span className="tabular-nums">거래 {tradeCount ?? 0}회</span>
          </span>
        </span>
        <span className="inline-flex text-text-3">
          <Chevron size={16} />
        </span>
      </div>

      <nav aria-label="내 활동" className="mt-group grid grid-cols-4 border-y border-border py-5">
        {quick.map(({ label, value, tab }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-control ${i ? "before:absolute before:bottom-[5px] before:left-0 before:top-2 before:w-px before:bg-border" : ""} ${PRESS_ROW} ${FOCUS_RING}`}
          >
            <span className="text-title-l font-semibold tabular-nums text-text-1">{value}</span>
            <span className="text-label text-text-2">{label}</span>
          </button>
        ))}
      </nav>

      {/* 지금 손봐야 하는 일이 있을 때만 나온다 — 없으면 이 블록 자체가 렌더되지 않는다. */}
      {pendingAddress && (
        <div className="pt-3">
          <button
            type="button"
            onClick={() => onOpenAddress(pendingAddress.auctionId, pendingAddress.title)}
            className={`flex w-full items-center gap-3 rounded-card bg-surface-2 px-4 py-3 text-left ${FOCUS_RING}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-body-s font-extrabold text-danger">배송지를 입력해 주세요</span>
              <span className="mt-1 block truncate text-label text-text-2">{pendingAddress.title} · 결제 완료</span>
            </span>
            <span className="flex-shrink-0 rounded-control bg-primary px-3 py-2 text-label font-extrabold text-white">입력</span>
          </button>
        </div>
      )}

      <GroupHead>구매</GroupHead>
      <Group>
        <TabRow label="제안 내역" value={counts.bidding} onClick={() => onSelectTab("bidding")} />
        <TabRow label="구매 내역" value={counts.purchases} badge={purchaseActionCount} onClick={() => onSelectTab("purchases")} />
        <TabRow label="찜한 상품" value={counts.wishlist} unit="개" onClick={() => onSelectTab("wishlist")} />
      </Group>

      <GroupHead>판매</GroupHead>
      <Group>
        <TabRow label="판매 중인 상품" value={counts.selling} onClick={() => onSelectTab("selling")} />
        <TabRow label="판매 내역" value={counts.sellHistory} badge={shipmentActionCount} onClick={() => onSelectTab("sellHistory")} />
      </Group>

      <GroupHead>계정 관리</GroupHead>
      <Group>
        {/* 내 정보는 맨 위 프로필 줄이 맡는다 — 같은 화면으로 가는 줄을 두 번 두지 않는다(#782).
            정산·환불 계좌는 「돈이 오가는 계좌」 한 묶음으로 나란히 둔다(데스크탑 #431과 같은 순서).
            회원 탈퇴는 메뉴가 아니라 내 정보 맨 아래 링크다. */}
        <TabRow label="배송지 관리" onClick={() => onSelectTab("shipping")} />
        <TabRow label="정산계좌" onClick={() => onSelectTab("settlement")} />
        <TabRow label="환불계좌" onClick={() => onSelectTab("refund")} />
        {/* 교환에서만 적용되는 차단이라 「계정」에 둔다 — 거래 그룹에 넣으면 판매까지 막는 것으로 읽힌다. */}
        <LinkRow label="교환 차단 목록" href="/mypage/exchange-blocks" />
        {isAdmin && (
          <Link href="/admin" className={`mt-2 flex min-h-[49px] items-center gap-2 rounded-control border-t border-border pt-2 text-body-l font-medium text-primary ${PRESS_ROW} ${FOCUS_RING}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 20 6v7c0 4-4 7-8 9-4-2-8-5-8-9V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="flex-1">관리자</span>
            <span className="inline-flex text-text-3"><Chevron /></span>
          </Link>
        )}
      </Group>

      <GroupHead>고객지원</GroupHead>
      <Group>
        {SUPPORT_LINKS.map(({ href, label }) => (
          <LinkRow key={href} label={label} href={href} />
        ))}
      </Group>

      <div className="flex justify-end pt-row">
        <button
          type="button"
          onClick={onLogout}
          className={`min-h-11 text-label text-text-2 ${PRESS_FADE} ${FOCUS_RING}`}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
