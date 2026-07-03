// 실제 낙찰(입찰) 이벤트는 bid 도메인이 생겨야 의미가 생긴다(§1 신뢰 원칙 — 없는 활동을
// 있는 것처럼 보여주면 안 됨) — 그 전까지는 레이아웃만 미리 잡아둔 예시 데이터임을 명시한다.
const DEMO_ITEMS = [
  "정국 Proof 위버스 특전 포카 — ₩44,000 낙찰",
  "NewJeans 민지 슬로건 — ₩28,500 낙찰",
  "SEVENTEEN 승관 포토카드 — ₩41,000 낙찰",
  "IVE 안유진 키링 — ₩19,000 낙찰",
  "Stray Kids 방찬 포토카드 — ₩55,000 낙찰",
];

export default function AuctionTicker() {
  const items = [...DEMO_ITEMS, ...DEMO_ITEMS];

  return (
    <div className="overflow-hidden bg-primary-dark py-2.5" aria-hidden="true">
      <div className="mx-auto flex max-w-[1160px] items-center gap-5 px-4">
        <span className="flex shrink-0 items-center gap-1.5 border-r border-white/15 pr-4 text-[11px] font-bold tracking-wide text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          실시간 경매 현황
          <span className="rounded-r1 bg-white/15 px-1 py-0.5 text-[9px] font-extrabold tracking-normal text-white/80">
            예시
          </span>
        </span>
        <div className="flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <div className="flex w-max animate-[tickerScroll_28s_linear_infinite] gap-7">
            {items.map((item, i) => (
              <span key={i} className="shrink-0 whitespace-nowrap text-xs text-white/65">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
