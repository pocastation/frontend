import type { Metadata } from "next";
import Link from "next/link";
import BadgeChips from "@/components/BadgeChips";
import { apiFetch } from "@/lib/api";
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
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <h1 className="font-display text-xl font-extrabold text-text-1">인기 판매자</h1>
      <p className="mt-1 text-sm text-text-3">
        거래 실적과 후기로 신뢰를 쌓은 판매자예요. 거래 5건 이상인 판매자만 보여드려요.
      </p>

      {sellers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-20 text-center">
          <p className="text-sm font-bold text-text-1">아직 소개할 판매자가 없어요</p>
          <p className="text-sm text-text-3">거래와 후기가 쌓이면 이곳에 표시돼요.</p>
        </div>
      ) : (
        <ol className="mt-6 flex flex-col divide-y divide-border/70 rounded-r3 border border-border bg-surface">
          {sellers.map((seller, index) => (
            <li key={seller.sellerId} className="p-0">
              <Link
                href={`/sellers/${seller.sellerId}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-surface-2/50 ${FOCUS_RING}`}
              >
              {/* 순위 — 상위 3명만 강조하고 나머지는 뉴트럴(절제 톤). */}
              <span
                className={`w-6 shrink-0 text-center font-display text-sm font-extrabold ${
                  index < 3 ? "text-primary" : "text-text-3"
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
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-text-1">
                    <span className="text-text-3">Lv.{seller.trustLevel}</span>
                    {plainLevelLabel(seller.trustLevelLabel)}
                  </span>
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
                <span aria-hidden="true" className="shrink-0 text-text-3">
                  →
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
  );
}
