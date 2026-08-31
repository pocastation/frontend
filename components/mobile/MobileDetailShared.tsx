"use client";

/**
 * 모바일 상세의 공유 조각(#461) — 제안판매(MobileAuctionDetail)와 즉시판매(MobileInstantDetail)
 * 두 상세가 판매자 행과 정보 탭을 똑같이 그린다. 한쪽에만 고치면 두 상세가 어긋나므로
 * 여기 한 곳에 둔다. 탭 여백 규칙(#457)도 이 파일이 단일 진실원이다.
 */

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import TrustLevelBadge from "@/components/TrustLevelBadge";
import { apiFetch } from "@/lib/api";
import { INTERMEDIARY_NOTICE } from "@/lib/business";
import { plainLevelLabel } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { SellerRatingResponse } from "@/lib/types";

const TAB_PRODUCT = "상품 정보";
const TAB_DELIVERY = "배송·환불";

export function SellerRow({ sellerId, nickname }: { sellerId: string; nickname: string }) {
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<SellerRatingResponse>(`/api/sellers/${sellerId}/rating`, { cache: "no-store" });
        if (!cancelled) {
          setLevelLabel(plainLevelLabel(res.trustLevelLabel));
          setLevel(res.trustLevel);
        }
      } catch {
        // 등급을 못 받으면 줄 자체를 비운다 — 틀린 등급을 보여주느니 안 보여준다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  return (
    <Link
      href={`/sellers/${sellerId}`}
      className={`mt-3.5 flex items-center gap-2.5 rounded-r3 border border-border p-3 ${FOCUS_RING}`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-primary">
        {nickname.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-extrabold text-text-1">{nickname}</span>
        {levelLabel && (
          <TrustLevelBadge level={level} className="mt-0.5 block w-fit text-[11.5px] text-text-3">
            {levelLabel}
          </TrustLevelBadge>
        )}
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-3" aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

export function MobileDetailTabs({
  description,
  specRows,
}: {
  description: string | null;
  specRows: { label: string; value: string }[];
}) {
  const [pickedTab, setPickedTab] = useState<string | null>(null);
  const tab = pickedTab ?? TAB_PRODUCT;

  return (
    <>
        {/* 탭 — 상품 정보 / 배송·환불. 「제안 내역」 탭은 §1.7로 없앴다. */}
        {/* 🔴 두 탭이 화면을 반씩 나눠 갖는다(#406). 좌측 정렬 auto 폭이던 시절엔 탭 두 개가
            왼쪽에 몰려 오른쪽 절반이 비고, 밑줄 길이도 글자 수에 따라 들쭉날쭉했다.
            밑줄은 보라 그대로다 — 디자인 절이 「보라는 활성 탭에」를 명시적으로 지정한다. */}
        <div role="tablist" className="mt-5 grid grid-cols-2 border-b border-border">
          {[TAB_PRODUCT, TAB_DELIVERY].map((name) => {
            const on = tab === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setPickedTab(name)}
                role="tab"
                aria-selected={on}
                className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-3 text-sm transition-colors ${FOCUS_RING} ${
                  on ? "border-primary font-extrabold text-text-1" : "border-transparent font-medium text-text-2"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* 탭 본문 여백 규칙(#457, 시안 승인) — 밑줄→본문 20px · 블록 간 20px ·
            끝 24px + 헤어라인 마감. 두 탭이 같은 값을 쓴다. */}
        {tab === TAB_DELIVERY ? (
          <div className="border-b border-border pb-6 pt-5">
            {/* 확정된 사실만 적는다 — 기간·조건 같은 숫자는 운영정책이 정본이라 여기서 새로 만들지 않는다. */}
            <dl className="divide-y divide-border border-y border-border">
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">배송비</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  판매자가 부담해요. 구매자가 따로 낼 배송비는 없어요.
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">받는 주소</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  가격 제안 전에 등록해요. 거래가 성사되면 등록한 주소로 판매자가 보내드려요.
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">환불·분쟁</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  기준과 절차는 운영정책을 따라요.
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex gap-3">
              <Link href="/policy" className={`text-[12.5px] font-bold text-text-2 underline ${FOCUS_RING}`}>
                운영정책 보기
              </Link>
              <Link href="/guide" className={`text-[12.5px] font-bold text-text-2 underline ${FOCUS_RING}`}>
                이용 방법
              </Link>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-text-3">{INTERMEDIARY_NOTICE}</p>
            {/* 문의는 신고와 성격이 다르다 — 사진 위 아이콘으로 올리지 않고 여기 조용히 둔다. */}
            <Link
              href="/inquiries/new"
              className={`mt-5 inline-block text-[12.5px] font-bold text-text-3 underline ${FOCUS_RING}`}
            >
              이 매물 문의하기
            </Link>
          </div>
        ) : (
          <div className="border-b border-border pb-6 pt-5">
            {description && (
              <p className="whitespace-pre-wrap text-sm leading-[1.75] text-text-2">{description}</p>
            )}
            {/* 🔴 라벨 폭을 고정해 값이 모두 같은 자리에서 시작한다(#406). 양끝 정렬이던 시절엔
                값이 오른쪽 끝에 붙어 라벨과 값 사이가 줄마다 다르게 벌어졌고, 「S급 (미개봉/신품급)」
                처럼 긴 값은 두 줄로 접히며 정렬이 무너졌다. 줄마다 긋던 구분선은 행간이 대신한다. */}
            <dl
              className={`${description ? "mt-5" : ""} grid grid-cols-[88px_1fr] gap-x-3 gap-y-3.5 text-[13px]`}
            >
              {specRows.map((row) => (
                <Fragment key={row.label}>
                  <dt className="text-text-3">{row.label}</dt>
                  <dd className="font-semibold text-text-1">{row.value}</dd>
                </Fragment>
              ))}
            </dl>

          </div>
        )}

    </>
  );
}
