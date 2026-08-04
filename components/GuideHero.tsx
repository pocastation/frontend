import type { ReactNode } from "react";

// 가이드 페이지 공통 히어로.
//
// 원본 시안은 보라 그라데이션(#1e1065 → #3b2494 → primary)이었지만, 우리 브랜드 히어로는
// **단색 딥스페이스 + 별빛**이다(Hero.tsx). 그라데이션을 그대로 두면 홈과 가이드가 다른 서비스처럼
// 보이므로 톤을 맞춘다.
//
// 별 좌표는 좌측 텍스트가 아니라 중앙 정렬 텍스트를 피해야 해서 좌우 가장자리와 상·하단에 둔다.
const STAR_DOTS: { top: string; left: string; size: number; lav?: boolean }[] = [
  { top: "16%", left: "7%", size: 2 },
  { top: "62%", left: "13%", size: 2, lav: true },
  { top: "28%", left: "22%", size: 3 },
  { top: "78%", left: "31%", size: 2, lav: true },
  { top: "14%", left: "72%", size: 2, lav: true },
  { top: "70%", left: "80%", size: 3 },
  { top: "34%", left: "91%", size: 2 },
  { top: "84%", left: "62%", size: 2 },
];

const SPARKLES: { top: string; left: string; size: number; lav?: boolean }[] = [
  { top: "24%", left: "84%", size: 12 },
  { top: "72%", left: "9%", size: 10, lav: true },
];

export default function GuideHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  // 히어로 하단 부가 영역(판매 등록 가이드의 단계 바로가기 등).
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-deepspace px-4 py-12 text-center text-white sm:py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STAR_DOTS.map((s, i) => (
          <span
            key={`d${i}`}
            className="absolute rounded-full"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              background: s.lav ? "#c8bcff" : "#ffffff",
              boxShadow: `0 0 ${s.size + 2}px ${s.lav ? "rgba(200,188,255,.7)" : "rgba(255,255,255,.8)"}`,
            }}
          />
        ))}
        {SPARKLES.map((s, i) => (
          <span
            key={`s${i}`}
            className="absolute leading-none"
            style={{ top: s.top, left: s.left, fontSize: s.size, color: s.lav ? "#c8bcff" : "#ffffff" }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="relative mx-auto max-w-[640px]">
        <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/50">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[30rem] text-sm leading-relaxed" style={{ color: "#c8bcff" }}>
          {description}
        </p>
        {children}
      </div>
    </section>
  );
}
