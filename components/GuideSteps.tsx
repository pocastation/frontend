import type { ReactNode } from "react";

export type GuideStep = {
  title: string;
  body: ReactNode;
  // 제목 옆 사실 표기(예: "3영업일 이내"). 배지가 아니라 각주 톤이다.
  note?: string;
};

/**
 * 이용 가이드 탭 안의 단계 목록.
 *
 * 제목이 설명보다 **확실히 먼저** 읽혀야 한다. 이전 구현은 제목을 170px 좌측 열에 가둬
 * 15.5px 제목이 옆의 13px 본문 덩어리에 눌렸다 — 순서상 왼쪽이어도 시선은 큰 덩어리로 먼저 간다.
 * 제목을 18px로 올려 본문 위에 세우고, 번호는 제목 위에 작게 얹는다.
 *
 * 카드는 쓰지 않는다. 단계는 서로 분리된 콘텐츠가 아니라 하나의 순서라, 헤어라인으로 잇는다.
 */
export default function GuideSteps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="mt-6">
      {steps.map((step, i) => (
        <li key={step.title} className="border-t border-border py-6 last:border-b">
          <div className="flex items-baseline justify-between gap-4">
            <span
              aria-hidden="true"
              className="font-display text-[11px] font-extrabold tabular-nums tracking-[0.08em] text-text-3"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {step.note && (
              <span className="shrink-0 text-[11.5px] font-bold text-text-3">{step.note}</span>
            )}
          </div>

          <h3 className="mt-1.5 font-display text-[18px] font-extrabold tracking-[-0.035em] text-text-1">
            <span className="sr-only">{i + 1}단계. </span>
            {step.title}
          </h3>
          <div className="mt-2 max-w-[36rem] text-[13.5px] leading-[1.8] text-text-2">
            {step.body}
          </div>
        </li>
      ))}
    </ol>
  );
}
