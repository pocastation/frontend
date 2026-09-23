"use client";

import Link from "next/link";
import TrustLevelBadge from "@/components/TrustLevelBadge";
import type { ReactNode } from "react";
import { FOCUS_RING, PRESS_ROW, PRESS_FADE } from "@/lib/ui";
import type { MypageTab } from "@/lib/mypage-tabs";

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
    <span className="flex min-h-[49px] w-full items-center justify-between gap-[9px] text-left">
      <span className="text-[15px] font-medium tracking-[-0.35px] text-text-1">{label}</span>
      <span className="inline-flex shrink-0 items-center gap-[9px]">
        {badge ? (
          <span aria-label={`확인이 필요한 항목 ${badge}건`} className="rounded-[4px] bg-primary-soft px-[7px] py-px text-[11px] font-semibold tabular-nums text-primary">새 소식 {badge}</span>
        ) : null}
        {value != null && <span className="text-sm font-semibold tabular-nums text-text-1">{value}<span className="ml-0.5 text-xs font-normal text-[#686873]">{unit}</span></span>}
        <span className="inline-flex text-[#686873]">
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
    <button type="button" onClick={onClick} className={`block w-full rounded-md ${PRESS_ROW} ${FOCUS_RING}`}>
      <RowShell label={label} value={value} badge={badge} unit={unit} />
    </button>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className={`block w-full rounded-md ${PRESS_ROW} ${FOCUS_RING}`}>
      <RowShell label={label} />
    </Link>
  );
}

function GroupHead({ children }: { children: ReactNode }) {
  return <h2 className="pb-[9px] pt-6 text-[13px] font-semibold text-[#686873]">{children}</h2>;
}

function Group({ children }: { children: ReactNode }) {
  return <div className="border-b border-border pb-[13px]">{children}</div>;
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
    <div className="px-6 pb-6 pt-7 max-[360px]:px-[18px] max-[360px]:pt-[22px] sm:hidden">
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
        className={`flex w-full cursor-pointer items-center gap-[13px] text-left ${PRESS_FADE} ${FOCUS_RING}`}
      >
        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
          {nickname.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold tracking-[-0.4px] text-text-1">{nickname}</span>
          <span className="mt-[3px] flex flex-wrap items-center gap-1.5 text-xs text-[#686873]">
            {trustLevel != null && (
              <TrustLevelBadge
                level={trustLevel}
                className="shrink-0 whitespace-nowrap rounded-[3px] border border-border-2 px-1.5 py-px text-[10.5px] font-bold text-text-2 no-underline"
              >
                {trustLevelLabel ?? `신뢰 ${trustLevel}`}
              </TrustLevelBadge>
            )}
            {trustLevel != null && <span aria-hidden="true">·</span>}
            <span className="tabular-nums">거래 {tradeCount ?? 0}회</span>
          </span>
        </span>
        <span className="inline-flex text-[#686873]">
          <Chevron size={16} />
        </span>
      </div>

      <nav aria-label="내 활동" className="mt-[25px] grid grid-cols-4 border-y border-border py-5">
        {quick.map(({ label, value, tab }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-[3px] rounded-[5px] ${i ? "before:absolute before:bottom-[5px] before:left-0 before:top-2 before:w-px before:bg-border" : ""} ${PRESS_ROW} ${FOCUS_RING}`}
          >
            <span className="text-[25px] font-semibold leading-[1.2] tracking-[-0.6px] tabular-nums text-text-1">{value}</span>
            <span className="text-xs text-[#686873]">{label}</span>
          </button>
        ))}
      </nav>

      {/* 지금 손봐야 하는 일이 있을 때만 나온다 — 없으면 이 블록 자체가 렌더되지 않는다. */}
      {pendingAddress && (
        <div className="pt-3">
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
        <TabRow label="제안 내역" value={counts.bidding} onClick={() => onSelectTab("bidding")} />
        <TabRow label="구매 내역" value={counts.purchases} badge={purchaseActionCount} onClick={() => onSelectTab("purchases")} />
        <TabRow label="찜한 상품" value={counts.wishlist} unit="개" onClick={() => onSelectTab("wishlist")} />
      </Group>

      <GroupHead>판매</GroupHead>
      <Group>
        <TabRow label="판매 중인 상품" value={counts.selling} onClick={() => onSelectTab("selling")} />
        <TabRow label="판매 내역" value={counts.sellHistory} badge={shipmentActionCount} onClick={() => onSelectTab("sellHistory")} />
        <TabRow label="정산 계좌" onClick={() => onSelectTab("settlement")} />
      </Group>

      <GroupHead>계정 관리</GroupHead>
      <Group>
        <TabRow label="내 정보" onClick={() => onSelectTab("profile")} />
        <TabRow label="배송지 관리" onClick={() => onSelectTab("shipping")} />
        <TabRow label="계정 설정" onClick={() => onSelectTab("settings")} />
        {/* 교환에서만 적용되는 차단이라 「계정」에 둔다 — 거래 그룹에 넣으면 판매까지 막는 것으로 읽힌다. */}
        <LinkRow label="교환 차단 목록" href="/mypage/exchange-blocks" />
        {isAdmin && (
          <Link href="/admin" className={`mt-2 flex min-h-[49px] items-center gap-[9px] rounded-md border-t border-border pt-[9px] text-[15px] font-medium text-primary ${PRESS_ROW} ${FOCUS_RING}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 20 6v7c0 4-4 7-8 9-4-2-8-5-8-9V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="flex-1">관리자</span>
            <span className="inline-flex text-[#686873]"><Chevron /></span>
          </Link>
        )}
      </Group>

      <div className="flex justify-end pt-[18px]">
        <button
          type="button"
          onClick={onLogout}
          className={`min-h-11 text-xs text-[#686873] ${PRESS_FADE} ${FOCUS_RING}`}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
