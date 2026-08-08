import Link from "next/link";
import { FAQ_CATEGORIES, FAQ_TOTAL } from "@/lib/faq-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "자주 묻는 질문 — Pocastation",
  description:
    "입찰·판매 등록·배송·수수료까지 — 포카스테이션 이용 중 자주 나오는 질문과 답을 모았습니다.",
};

/**
 * 자주 묻는 질문(#298).
 *
 * <p><b>서버 컴포넌트로 둔다.</b> 아코디언을 네이티브 `<details>`로 만들면 JS 없이 접히므로
 * `"use client"`가 필요 없다 — 콘텐츠가 HTML에 그대로 실려 검색 노출에도 유리하다.
 *
 * <p><b>검색창은 두지 않는다.</b> 29개는 눈으로 훑는 편이 빠르고, 검색창이 있으면 오히려
 * "찾아야 하는 양"으로 보인다.
 *
 * <p>`/guide`와 역할이 다르다 — 가이드는 거래 흐름을 <b>순서대로</b> 설명하고, 여기는
 * <b>개별 질문에 답한다</b>. 서로 링크만 걸어 둔다.
 */
export default function FaqPage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-11 pb-16 sm:pt-14">
        <header>
          <p className="text-[12px] font-bold text-text-3">고객지원</p>
          <h1 className="mt-2 font-display text-[27px] font-extrabold leading-[1.15] tracking-[-0.04em] text-text-1 sm:text-[32px]">
            자주 묻는 질문
          </h1>
          <p className="mt-3.5 max-w-[33rem] text-[13.5px] leading-[1.75] text-text-2">
            거래하다 자주 나오는 질문을 모았어요. 궁금한 항목을 눌러 펼쳐 보세요.
          </p>
          <p className="mt-3 text-[12px] text-text-3">
            총 {FAQ_TOTAL}개 · 거래 흐름 전체가 궁금하다면{" "}
            <Link
              href="/guide"
              className={`font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary ${FOCUS_RING}`}
            >
              이용 가이드
            </Link>
            를 먼저 보세요
          </p>
        </header>

        {/* 목차 — 카테고리가 7개라 위에서부터 읽으면 원하는 데까지 한참 걸린다.
            알약 링크가 아니라 밑줄 항목으로 둔다(가이드와 같은 기조). */}
        <nav aria-label="분류 바로가기" className="mt-7 grid grid-cols-2 sm:grid-cols-4">
          {FAQ_CATEGORIES.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className={`flex items-baseline gap-2 border-b border-border py-2.5 text-[12.5px] text-text-2 transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className="font-display text-[11px] font-extrabold tabular-nums text-text-3"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {c.title}
            </a>
          ))}
        </nav>

        {FAQ_CATEGORIES.map((category, i) => (
          <section key={category.id} id={category.id} className="mt-12 scroll-mt-24 first:mt-14">
            <div className="border-t border-text-1/25 pt-4">
              <span
                aria-hidden="true"
                className="block font-display text-[11px] font-extrabold tabular-nums tracking-[0.08em] text-text-3"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-1.5 font-display text-[21px] font-extrabold tracking-[-0.035em] text-text-1">
                {category.title}
              </h2>
              <p className="mt-2 text-[13px] text-text-3">{category.lead}</p>
            </div>

            <div className="mt-4">
              {/* 열림 상태를 배경색으로 칠하지 않는다 — 화살표 방향만으로 말한다. */}
              {category.items.map((item) => (
                <details key={item.q} className="border-b border-border-2/60">
                  <summary
                    className={`flex cursor-pointer list-none items-start gap-3 py-3.5 text-[14px] font-bold leading-[1.6] tracking-[-0.01em] text-text-1 transition-colors hover:text-primary ${FOCUS_RING} [&::-webkit-details-marker]:hidden`}
                  >
                    <span className="min-w-0 flex-1">{item.q}</span>
                    {/* 열림/닫힘은 방향으로만 말한다. +/− 기호는 버튼처럼 읽혀 오해를 준다. */}
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="faq-chevron mt-1 shrink-0 text-text-3"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="pb-4 pr-7">
                    {item.a.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-1.5 text-[13.5px] leading-[1.8] text-text-2 first:mt-0"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── 못 찾았을 때 ── 본문과 성격이 다른 마무리라 지면을 바꿔 넘긴다. */}
      <section className="border-t border-border bg-surface-2" aria-labelledby="faq-more">
        <div className="mx-auto max-w-[820px] px-5 py-12 sm:py-14">
          <h2
            id="faq-more"
            className="font-display text-[19px] font-extrabold tracking-[-0.03em] text-text-1"
          >
            찾는 답이 없다면
          </h2>
          <p className="mt-1.5 max-w-[34rem] text-[13px] leading-[1.75] text-text-3">
            문의를 남겨 주시면 확인 후 답변드려요. 거래 중인 건이라면 어떤 매물인지 함께 적어 주시면
            훨씬 빠릅니다.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/inquiries/new"
              className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-8 text-[14px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
            >
              문의하기
            </Link>
            <Link
              href="/guide"
              className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
            >
              이용 가이드
            </Link>
            <Link
              href="/terms"
              className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
            >
              이용약관
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
