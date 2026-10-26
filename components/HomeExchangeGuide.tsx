import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 홈의 교환 안내(#804).
 *
 * <p>회색 배경띠를 두르지 않는다. 푸터가 거의 같은 색(`#faf9fc`)이라 띠를 깔면 본문이 어디서
 * 끝나는지 사라진다. 흰 지면에 두고 섹션 간격과 제목이 경계를 맡는다.
 *
 * <p><b>아래 여백을 직접 갖는다.</b> 레이아웃의 `pb-footer`는 `max-sm:`이라 데스크탑에는
 * 붙지 않는다 — 기존 데스크탑 섹션들이 `py-10`으로 각자 아래를 챙기고 있었고, 그걸 모르고
 * `pt-section`만 주면 홈의 마지막 블록이 푸터에 그대로 달라붙는다(실측 1354 = 1354).
 * 값은 모바일과 같은 64로 맞춘다 — 기존 섹션의 40은 뒤에 또 섹션이 올 때의 간격이라
 * 본문의 끝자리에는 좁다.
 *
 * <p>원형 숫자 배지를 쓰지 않는다 — 디자인 규칙이 금지한다. 숫자는 흐린 글자로만 둔다.
 */

const STEPS = [
  { no: "1", title: "행사를 골라요", desc: "가려는 공개방송 회차를 캘린더에서 찾아요." },
  { no: "2", title: "교환글을 올려요", desc: "가진 포카와 원하는 포카, 만날 시간대를 적어요." },
  { no: "3", title: "현장에서 만나요", desc: "신청을 수락하면 1:1 대화로 자리를 정해요." },
];

export default function HomeExchangeGuide() {
  return (
    <section className="px-gutter pt-section sm:mx-auto sm:max-w-[1160px] sm:px-4 sm:pb-footer">
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-title-s font-extrabold sm:font-display sm:text-title">교환은 이렇게 해요</h2>
        {/* 데스크탑은 지면이 넓어 제목 줄에 버튼이 들어간다. 모바일은 단계 아래에 가로로 깐다. */}
        <Link
          href="/events"
          className={`hidden h-10 items-center rounded-control bg-primary px-5 text-body font-extrabold text-white transition-colors hover:bg-primary-dark sm:flex ${FOCUS_RING}`}
        >
          교환글 쓰기
        </Link>
      </div>

      <ol className="mt-head flex flex-col gap-4 sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-10">
        {STEPS.map((step) => (
          <li key={step.no} className="flex gap-3 sm:block sm:border-t sm:border-border sm:pt-4">
            <span className="w-4 shrink-0 font-display text-body-l font-extrabold text-border-2">{step.no}</span>
            <div className="flex-1">
              <p className="text-body font-extrabold text-text-1 sm:mt-1 sm:text-body-l">{step.title}</p>
              <p className="mt-1 text-body-s leading-relaxed text-text-2">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/events"
        className={`mt-cta flex h-12 items-center justify-center rounded-control bg-primary text-body font-extrabold text-white transition-colors hover:bg-primary-dark sm:hidden ${FOCUS_RING}`}
      >
        교환글 쓰기
      </Link>
    </section>
  );
}
