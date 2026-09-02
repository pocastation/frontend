import type { Metadata } from "next";
import Link from "next/link";
import BadgeChips from "@/components/BadgeChips";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch } from "@/lib/api";
import TrustLevelBadge from "@/components/TrustLevelBadge";
import { plainLevelLabel } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { PopularSellerResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "인기 판매자 — Pocastation",
  description: "거래 후기와 거래 실적으로 신뢰를 쌓은 판매자를 만나보세요.",
};

// 인기(신뢰) 판매자 랭킹(§12.7, #205). 정렬·최소 거래 게이트·정지회원 제외는 서버가 처리하고,
// 여기서는 표시만 한다. 신뢰점수(0~100) 숫자는 서버가 내려주지 않으므로 레벨·거래수·평점만 노출.
async function getPopularSellers(): Promise<PopularSellerResponse[]> {
  try {
    return await apiFetch<PopularSellerResponse[]>("/api/sellers/popular?size=30", { cache: "no-store" });
  } catch {
    // 랭킹 조회 실패는 페이지 자체를 죽이지 않는다 — 빈 상태로 안내.
    return [];
  }
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-[#f5b301]" aria-label={`별점 ${value.toFixed(1)}점`}>
      {"★★★★★".slice(0, full)}
      <span className="text-border-2">{"★★★★★".slice(full)}</span>
    </span>
  );
}

export default async function PopularSellersPage() {
  const sellers = await getPopularSellers();

  return (
    <>
      <MobilePageHead title="인기 판매자" />

      <div className="mx-auto max-w-[1160px] px-[14px] py-5 sm:px-4 sm:py-10">
        <h1 className="hidden font-display text-xl font-extrabold text-text-1 sm:block">인기 판매자</h1>
        <p className="text-[12.5px] text-text-3 sm:mt-1 sm:text-sm">
          거래 실적과 후기로 신뢰를 쌓은 판매자예요. 거래 5건 이상인 판매자만 보여드려요.
        </p>

      {sellers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-20 text-center">
          <p className="text-sm font-bold text-text-1">아직 소개할 판매자가 없어요</p>
          <p className="text-sm text-text-3">거래와 후기가 쌓이면 이곳에 표시돼요.</p>
        </div>
      ) : (
        /*
          🔴 목록 전체를 카드로 감싸지 않는다(#510). 30명을 테두리 하나에 넣으면 「같은 카드로
          전부 감싸기」가 되고, 모바일에서는 그 카드가 화면 폭을 다 써서 감싸는 의미도 없다.
          헤어라인만으로 줄을 가른다.

          데스크탑도 **1열**이다. 스타 목록은 2열로 갔지만 판매자는 **순위가 정보**라 한 줄로
          내려 읽어야 한다 — 2열이면 왼쪽에 1·3·5, 오른쪽에 2·4·6이 와서 지그재그가 된다.
        */
        <ol className="mt-4 flex flex-col sm:mt-6">
          {sellers.map((seller, index) => (
            <li key={seller.sellerId} className="p-0">
              <Link
                href={`/sellers/${seller.sellerId}`}
                className={`flex items-center gap-3 border-b border-border py-3 transition-colors hover:bg-surface-2/50 sm:px-2 ${FOCUS_RING}`}
              >
              {/*
                순위 — 상위 3명만 강조한다(절제 톤, 기존 판단 유지). 다만 **색이 아니라 농도**로
                한다(#510): 보라는 상태·행동을 말하는 자리(선택됨·활성 탭·CTA·필수·포커스)에만
                쓰는데, 1·2·3등은 상태가 아니라 **값**이다. 그 자리에 브랜드색이 있으면
                「누를 수 있는 것」처럼 읽힌다.
              */}
              <span
                className={`w-6 shrink-0 text-center font-display text-sm font-extrabold tabular-nums ${
                  index < 3 ? "text-text-1" : "text-text-3"
                }`}
              >
                {index + 1}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-text-2">
                {seller.nickname.slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-text-1">{seller.nickname}</span>
                  <TrustLevelBadge
                    level={seller.trustLevel}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-text-1 decoration-transparent hover:decoration-text-3"
                  >
                    <span className="text-text-3">Lv.{seller.trustLevel}</span>
                    {plainLevelLabel(seller.trustLevelLabel)}
                  </TrustLevelBadge>
                  {/* 배지는 레벨 바로 뒤 — 마이페이지·판매자 상세와 같은 자리다(BE #273).
                      옵셔널 체이닝이 아니라 기본값을 주는 이유는 컴포넌트가 배열을 요구하기 때문. */}
                  <BadgeChips badges={seller.badges ?? []} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-3">
                  <span>거래 {seller.tradeCount}회</span>
                  {seller.reviewCount > 0 && seller.averageRating !== null ? (
                    <span className="flex items-center gap-1">
                      <Stars value={seller.averageRating} />
                      <span className="font-semibold text-text-2">{seller.averageRating.toFixed(1)}</span>
                      <span>({seller.reviewCount})</span>
                    </span>
                  ) : (
                    <span>후기 없음</span>
                  )}
                </div>
              </div>
                {/* 줄 끝의 「더 보기」 표시 — 목록 줄에서 쓰는 모양으로 맞춘다. */}
                <span aria-hidden="true" className="shrink-0 text-text-3">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

        {/* 표시광고법 정합(§9.2-4) — 광고성 오인 소지를 없애기 위해 산정 근거를 명시한다. */}
        <p className="mt-4 text-[11px] text-text-3">
          순위는 거래 실적과 후기를 반영해 산정되며, 광고나 유료 노출이 아니에요.
        </p>
      </div>
    </>
  );
}
