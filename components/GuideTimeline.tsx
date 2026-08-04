import type { ReactNode } from "react";

// 가이드의 단계 목록.
//
// 처음에는 좌측에 번호 레일을 세운 타임라인이었는데, 그러면 **단계 카드만 레일 폭(36px + gap)만큼
// 안쪽으로 밀려** 같은 화면의 다른 박스(안전 거래 팁 등)와 좌변이 어긋난다. 실측 56px 차이였다.
// 번호를 카드 안으로 넣어 모든 박스가 같은 좌변·같은 폭을 쓰게 했다.
//
// 배지는 아이콘이 맡고 번호는 제목 앞에 작게 붙인다 — 번호 배지와 아이콘 배지를 나란히 두면
// 시각 요소가 겹쳐 답답해진다.

export type GuideStep = {
  title: string;
  body: ReactNode;
  icon: ReactNode;
  // 우측 상단 보조 표시(예: "3영업일 이내"). 강조가 아니라 사실 표기다.
  note?: string;
};

export default function GuideTimeline({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="mt-6 flex flex-col gap-3">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="rounded-r3 border border-border bg-surface p-5 shadow-card"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r2 bg-surface-2 text-primary"
            >
              {step.icon}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-[15px] font-extrabold leading-9 text-text-1">
                  <span aria-hidden="true" className="mr-1.5 font-bold text-text-3">
                    {i + 1}.
                  </span>
                  <span className="sr-only">{i + 1}단계. </span>
                  {step.title}
                </h3>
                {step.note && (
                  <span className="mt-1.5 shrink-0 rounded-r1 border border-border-2 px-2 py-1 text-[10.5px] font-bold text-text-3">
                    {step.note}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[13px] leading-relaxed text-text-2">{step.body}</div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
