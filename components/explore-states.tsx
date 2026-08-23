import { FOCUS_RING } from "@/lib/ui";

// 홈 그리드(AuctionExplorer)·매물 목록(AuctionBrowser)·아티스트(ArtistExplorer) 세 탐색
// 화면이 공유하는 UX 상태 컴포넌트를 한곳에 모은다 — 로딩 스켈레톤·빈 상태·에러 배너.
// 세 화면의 검색/정렬 패턴이 동일하므로 상태 UI도 여기서 통일해 일관성을 유지한다.

/** 카운트 행 등에서 "불러오는 중"을 알리는 작은 스피너. */
export function InlineSpinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-border-2 border-t-primary align-middle motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

/** AuctionCard 자리를 채우는 스켈레톤(2:3 썸네일 + 텍스트 라인). */
export function AuctionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-r4 border border-border bg-surface shadow-card">
      <div className="sk-shimmer aspect-[2/3] w-full" />
      <div className="px-3.5 py-3">
        <div className="sk-shimmer h-2.5 w-2/5 rounded" />
        <div className="sk-shimmer mt-2 h-3 w-4/5 rounded" />
        <div className="my-2.5 h-px bg-border" />
        <div className="flex items-baseline justify-between">
          <div className="sk-shimmer h-4 w-1/2 rounded" />
          <div className="sk-shimmer h-2.5 w-1/5 rounded" />
        </div>
      </div>
    </div>
  );
}

/** ArtistCard 자리를 채우는 스켈레톤(원형 아바타 + 라벨/이름 라인). */
export function ArtistCardSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-r4 border border-border bg-surface p-4 pt-5 shadow-card">
      <div className="sk-shimmer mb-2.5 h-[76px] w-[76px] rounded-full" />
      <div className="sk-shimmer mb-1.5 h-4 w-14 rounded-full" />
      <div className="sk-shimmer h-3.5 w-20 rounded" />
      <div className="sk-shimmer mt-1.5 h-2.5 w-12 rounded" />
    </div>
  );
}

/** N개의 스켈레톤 카드를 렌더(기본값은 화면당 적당한 수). */
export function CardSkeletonGrid({
  count,
  variant,
}: {
  count: number;
  variant: "auction" | "artist";
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) =>
        variant === "auction" ? <AuctionCardSkeleton key={i} /> : <ArtistCardSkeleton key={i} />,
      )}
    </>
  );
}

/** 검색 결과가 0건일 때. 검색어가 있으면(=onClear 제공) 돋보기 아이콘 + 지우기 액션. */
export function ExploreEmpty({
  title,
  hint,
  onClear,
  clearLabel = "검색어 지우기",
}: {
  title: string;
  hint?: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-surface-2 text-text-3">
        {onClear ? (
          // 검색 결과 없음 — 돋보기(가로줄)
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M8 11h6" />
          </svg>
        ) : (
          // 애초에 항목이 없음 — 빈 상자
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        )}
      </div>
      <p className="text-sm font-bold text-text-2">{title}</p>
      {hint && <p className="text-[12.5px] text-text-3">{hint}</p>}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-1 inline-flex h-[38px] items-center gap-1.5 rounded-full border border-border-2 bg-white px-[18px] text-[13px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

/** 요청 실패 시 인라인 에러 배너 + 다시 시도. 기존 목록은 호출부에서 흐리게 남겨 맥락을 유지한다. */
export function ExploreError({
  title = "목록을 불러오지 못했어요",
  onRetry,
}: {
  title?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-r3 border border-accent/25 bg-accent-soft px-4 py-3.5"
    >
      <span className="shrink-0 text-accent" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <span className="flex-1">
        <span className="block text-[13.5px] font-extrabold text-text-1">{title}</span>
        <span className="mt-0.5 block text-xs text-text-2">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-extrabold text-white transition hover:brightness-95 ${FOCUS_RING}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        다시 시도
      </button>
    </div>
  );
}
