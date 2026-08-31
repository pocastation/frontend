import Link from "next/link";
import type { Metadata } from "next";
import { GUIDE_DEADLINES, GUIDE_DOCS, GUIDE_FLOW, GUIDE_GROUPS } from "@/lib/guide-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata: Metadata = {
  title: "이용 가이드",
  description: "가격 제안부터 발송·정산까지, 포카스테이션 거래에 필요한 것만 모았어요.",
};

/**
 * 이용 가이드 첫 화면 — 도움말 센터(#437).
 *
 * <p>🔴 <b>문서 목록만 나열하지 않는다.</b> 어디부터 읽어야 할지 모르는 채로 목록을 만나면
 * 아무것도 안 읽는다. 그래서 <b>거래 흐름 → 기한 → 문서</b> 순으로 둔다.
 *
 * <ol>
 *   <li><b>흐름</b> — 순서와 <b>주체</b>를 먼저 잡아준다. 구매자 보라, 판매자 검정</li>
 *   <li><b>기한</b> — 문의가 가장 많이 몰리는 값이라 따로 뽑는다</li>
 *   <li><b>문서</b> — 살 때 · 팔 때 · 알아두기</li>
 * </ol>
 *
 * <p>예전 화면에 있던 「처음이어도 괜찮아요」 같은 안심 카피는 넣지 않는다. 도움말은
 * <b>사실을 찾으러</b> 오는 자리라 격려 문장이 정보 밀도만 낮춘다.
 */
export default function GuidePage() {
  return (
    <div className="mx-auto max-w-[880px] px-5 pt-10 pb-16 sm:pt-14">
      <header>
        <span aria-hidden="true" className="block h-[3px] w-7 bg-primary" />
        <h1 className="mt-5 font-display text-[26px] font-extrabold leading-[1.2] tracking-[-0.04em] text-text-1 sm:text-[32px]">
          이용 가이드
        </h1>
      </header>

      {/* 데스크탑에서는 흐름과 기한을 나란히 둔다 — 둘 다 「읽기」가 아니라 「훑기」용이라
          세로로 쌓으면 문서 목록이 화면 밖으로 밀린다. */}
      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_260px] sm:gap-10">
        <section>
          <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
            제안판매 거래 흐름
          </h2>
          <ol className="mt-3">
            {GUIDE_FLOW.map((step, i) => {
              const isBuyer = step.who === "구매자";
              const last = i === GUIDE_FLOW.length - 1;
              return (
                <li key={step.act} className="flex items-start gap-2.5">
                  {/* 번호와 세로선이 한 축이 되어 「순서」를 만든다 — 점만 찍으면 목록이지 흐름이 아니다. */}
                  <span aria-hidden="true" className="flex shrink-0 flex-col items-center self-stretch">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full font-display text-[10.5px] font-extrabold text-white ${
                        isBuyer ? "bg-primary" : "bg-text-1"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {!last && <span className="min-h-[14px] w-px flex-1 bg-border-2" />}
                  </span>
                  <span className={`min-w-0 flex-1 ${last ? "" : "pb-3"}`}>
                    <span className="flex flex-wrap items-baseline gap-1.5">
                      <span
                        className={`text-[10.5px] font-extrabold ${isBuyer ? "text-primary" : "text-text-3"}`}
                      >
                        {step.who}
                      </span>
                      <span className="break-keep text-[15.5px] font-bold tracking-[-0.025em] text-text-1">
                        {step.act}
                      </span>
                    </span>
                    <span className="mt-0.5 block break-keep text-[13px] leading-relaxed text-text-3">
                      {step.note}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="self-start rounded-r2 bg-surface-2 px-3.5 pb-3.5 pt-3">
          <h2 className="text-[12px] font-extrabold tracking-[0.04em] text-text-3">기한 한눈에</h2>
          <dl className="mt-1.5">
            {GUIDE_DEADLINES.map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-baseline justify-between gap-3 py-2 ${
                  i ? "border-t border-border-2" : ""
                }`}
              >
                <dt className="shrink-0 whitespace-nowrap text-[13.5px] text-text-2">{k}</dt>
                <dd className="text-right font-display text-[14px] font-extrabold tracking-[-0.02em] tabular-nums text-text-1">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {GUIDE_GROUPS.map((group) => (
        <section key={group.title} className="mt-9">
          <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
            {group.title}
          </h2>
          <ul className="mt-1.5 border-t border-border">
            {group.ids.map((id) => {
              const doc = GUIDE_DOCS.find((d) => d.id === id);
              if (!doc) return null;
              return (
                <li key={id} className="border-b border-border">
                  <Link
                    href={`/guide/${id}`}
                    className={`flex min-h-[60px] items-center justify-between gap-2.5 py-3 ${FOCUS_RING}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold tracking-[-0.025em] text-text-1">
                        {doc.title}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-text-3">{doc.desc}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-[16px] text-text-3">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* 문서로 해결되지 않는 경우의 출구 — 도움말 센터에는 반드시 있어야 한다. */}
      <section className="mt-10 border-t border-border pt-6">
        <p className="text-[13px] text-text-3">이 문서로 해결되지 않았다면</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Link
            href="/faq"
            className={`rounded-r2 border border-border-2 bg-surface px-3.5 py-2 text-[13px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
          >
            자주 묻는 질문
          </Link>
          <Link
            href="/inquiries/new"
            className={`rounded-r2 bg-text-1 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-text-2 ${FOCUS_RING}`}
          >
            1:1 문의
          </Link>
        </div>
      </section>
    </div>
  );
}
