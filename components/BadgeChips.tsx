import type { BadgeView } from "@/lib/types";

// 회원 배지 표시(BE #264). 신뢰 레벨 pill 바로 옆에 붙는다 — "두 번째 자격"으로 읽히게.
//
// 골드는 채우기가 아니라 테두리·글자에만 쓴다. 파스텔 필 배지는 이 레포가 명시적으로 금지한
// 톤이고(CLAUDE.md), 얼리어답터는 상태가 아니라 칭호라 배경까지 채우면 상태 배지처럼 읽힌다.
// 별빛 골드 원색(--color-star)은 흰 지면에서 대비가 모자라 한 단계 어두운 토큰을 쓴다.
export default function BadgeChips({ badges, className = "" }: { badges: BadgeView[]; className?: string }) {
  if (badges.length === 0) {
    return null;
  }
  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.code}
          // title로 설명을 붙인다 — 칭호만 보고 "이게 뭔데"가 되지 않도록.
          title={badge.description}
          className={`inline-flex items-center rounded-full border border-star-line px-2 py-0.5 text-[11px] font-bold text-star-ink ${className}`}
        >
          {badge.label}
        </span>
      ))}
    </>
  );
}
