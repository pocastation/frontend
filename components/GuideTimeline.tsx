import type { ReactNode } from "react";

// 가이드의 단계 타임라인 — 좌측 번호 레일 + 우측 카드.
//
// 원본 시안은 단계 배지를 파스텔 필(accent-soft 배경 + accent 텍스트)로 썼는데, 레포 디자인 규칙이
// 파스텔 필 배지를 금지한다(CLAUDE.md). 헤어라인 테두리 + 뉴트럴 텍스트로 바꿨다.

export type GuideStep = {
  title: string;
  body: ReactNode;
  icon: ReactNode;
  // 우측 상단 보조 표시(예: "3영업일 이내"). 강조가 아니라 사실 표기다.
  note?: string;
};

export default function GuideTimeline({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="mt-6 flex flex-col">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3.5 sm:gap-5">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-primary"
            >
              {i + 1}
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-border-2" />}
          </div>

          <div
            className={`min-w-0 flex-1 rounded-r3 border border-border bg-surface p-4 shadow-card sm:p-5 ${
              i < steps.length - 1 ? "mb-3.5" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r2 bg-surface-2 text-primary"
                >
                  {step.icon}
                </span>
                <h3 className="font-display text-[15px] font-extrabold text-text-1">
                  <span className="sr-only">{i + 1}단계. </span>
                  {step.title}
                </h3>
              </div>
              {step.note && (
                <span className="shrink-0 rounded-r1 border border-border-2 px-2 py-1 text-[10.5px] font-bold text-text-3">
                  {step.note}
                </span>
              )}
            </div>
            <div className="mt-2.5 text-[13px] leading-relaxed text-text-2">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
