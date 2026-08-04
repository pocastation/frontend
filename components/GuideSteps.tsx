import type { ReactNode } from "react";

export type GuideStep = {
  title: string;
  body: ReactNode;
  // 제목 옆 사실 표기(예: "3영업일 이내"). 배지가 아니라 부제 톤이다.
  note?: string;
};

/**
 * 이용 가이드 탭 안의 단계 목록.
 *
 * 카드를 쓰지 않는다. 단계는 서로 분리된 독립 콘텐츠가 아니라 **하나의 순서**여서,
 * 테두리로 11번 끊는 것보다 헤어라인 하나로 잇는 편이 읽기에 맞다.
 * (이전 구현은 단계마다 border + radius + shadow 카드를 반복해 목록 전체가
 *  같은 블록의 나열로 보였고, 어느 단계가 중요한지 형태가 말해주지 않았다.)
 *
 * 좌측은 번호 + 제목, 우측은 본문인 2단 구성이다. 제목열의 폭을 고정해
 * 본문 시작선이 세로로 맞아떨어지게 한다 — 표를 그리지 않고 표의 정렬만 가져온다.
 */
export default function GuideSteps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="mt-7 border-t border-text-1/20">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="border-b border-border py-6 sm:flex sm:gap-10 sm:py-7"
        >
          <div className="flex items-baseline gap-3 sm:w-[170px] sm:shrink-0">
            <span
              aria-hidden="true"
              className="font-display text-[12px] font-extrabold tabular-nums text-text-3"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[15.5px] font-extrabold tracking-[-0.02em] text-text-1">
                <span className="sr-only">{i + 1}단계. </span>
                {step.title}
              </h3>
              {step.note && <p className="mt-1 text-[11.5px] text-text-3">{step.note}</p>}
            </div>
          </div>

          <div className="mt-2.5 text-[13px] leading-[1.75] text-text-2 sm:mt-0 sm:flex-1">
            {step.body}
          </div>
        </li>
      ))}
    </ol>
  );
}
