import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 교환 3단계 안내(#798).
 *
 * <p>가오픈 홈에 두는 이유. 교환은 새 기능이고 「행사 고르기 → 글 쓰기 → 현장에서 만나기」라는
 * 흐름이 처음 온 사람에게 보이지 않는다. 설명을 읽히려는 것이 아니라 <b>할 수 있는 일이
 * 무엇인지</b>를 한 눈에 두는 자리다.
 *
 * <p>원형 숫자 배지를 쓰지 않는다. 번호는 글자로만 둔다.
 */
const STEPS = [
  { no: "1", title: "행사를 골라요", desc: "가려는 공개방송 회차를 캘린더에서 찾아요." },
  { no: "2", title: "교환글을 올려요", desc: "가진 포카와 원하는 포카를 적어요." },
  { no: "3", title: "현장에서 만나요", desc: "신청을 수락하면 1:1로 약속을 정해요." },
] as const;

export default function HomeExchangeGuide({ variant }: { variant: "mobile" | "desktop" }) {
  if (variant === "desktop") {
    return (
      <section className="mt-section flex items-center gap-12 rounded-card bg-surface-2 px-8 py-8">
        <div className="grid flex-1 grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <Step key={step.no} {...step} />
          ))}
        </div>
        <WriteButton className="h-12 shrink-0 px-7" />
      </section>
    );
  }
  return (
    <section className="px-gutter pt-section">
      <h2 className="text-title-s font-extrabold text-text-1">교환은 이렇게 해요</h2>
      <div className="mt-head flex flex-col gap-4">
        {STEPS.map((step) => (
          <Step key={step.no} {...step} />
        ))}
      </div>
      <WriteButton className="mt-cta h-12 w-full" />
    </section>
  );
}

function Step({ no, title, desc }: { no: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 font-display text-body-l font-extrabold text-text-3">{no}</span>
      <div>
        <p className="text-body font-extrabold text-text-1">{title}</p>
        <p className="mt-1 text-body-s text-text-2">{desc}</p>
      </div>
    </div>
  );
}

/** 교환글은 행사 안에서 쓴다 — 독립 작성 화면이 없어 캘린더로 보낸다. */
function WriteButton({ className }: { className: string }) {
  return (
    <Link
      href="/events"
      className={`flex items-center justify-center rounded-control bg-primary text-body font-extrabold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING} ${className}`}
    >
      교환글 쓰기
    </Link>
  );
}
