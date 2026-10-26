import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 준비 중 화면(#798).
 *
 * <p>경고 상자로 만들지 않는다. 디자인 규칙은 「진짜 경고·오류만 회색 안내 상자로 세우고 일반
 * 안내는 helper 문장으로 녹인다」이고, 준비 중은 경고가 아니라 <b>빈 상태</b>다.
 *
 * <p>그림은 선만 쓴다. 장식용 아이콘·이모지를 쓰지 않는 규칙 안에서, 빈 화면이 고장처럼
 * 보이지 않을 만큼만 둔다.
 *
 * <p>나갈 길을 함께 둔다. 빈 화면에서 뒤로가기 말고 방법이 없으면 거기서 이탈한다.
 */
export default function ComingSoon({
  action,
  compact = false,
}: {
  /** 나갈 길. 없으면 버튼을 그리지 않는다(홈 섹션 안처럼 이미 다른 길이 있는 자리). */
  action?: { href: string; label: string };
  /** 홈 섹션 안에 들어갈 때. 그림과 여백을 줄인다. */
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-7" : "py-empty"}`}>
      <CardStack size={compact ? 56 : 104} />
      <p className={`${compact ? "mt-head" : "mt-card"} ${compact ? "text-body" : "text-title"} font-extrabold text-text-1`}>
        준비 중인 기능이에요.
      </p>
      <p className="mt-tight text-label text-text-3">빠른 시일 내로 찾아뵐게요</p>
      {action ? (
        <Link
          href={action.href}
          className={`mt-cta flex h-12 w-full max-w-80 items-center justify-center rounded-control bg-primary text-body font-extrabold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** 포카 두 장이 겹친 선 그림. 색 없이 헤어라인만 쓴다. */
function CardStack({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 104 104" fill="none" aria-hidden="true">
      <rect
        x="18"
        y="20"
        width="44"
        height="60"
        rx="6"
        transform="rotate(-8 40 50)"
        className="fill-white stroke-border-2"
        strokeWidth="1.8"
      />
      <rect x="44" y="24" width="44" height="60" rx="6" className="fill-surface-2 stroke-border-2" strokeWidth="1.8" />
      <circle cx="58" cy="40" r="4" className="stroke-border-2" strokeWidth="1.8" />
      <path
        d="M50 74 L60 58 L68 68 L74 60 L82 74"
        className="stroke-border-2"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
