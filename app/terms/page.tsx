import { INTERMEDIARY_NOTICE } from "@/lib/business";
import {
  TERMS_ADDENDUM,
  TERMS_CHAPTERS,
  TERMS_EFFECTIVE_DATE,
  type TermsLine,
} from "@/lib/terms-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = { title: "이용약관 — Pocastation" };

// 조문 앵커 — 목차에서 바로 이동한다. "제13조의2" 같은 표기도 그대로 쓸 수 있게 숫자만 뽑는다.
function anchorOf(no: string) {
  return `article-${no.replace(/[^0-9]/g, "-").replace(/^-|-$/g, "")}`;
}

function TermsLineRow({ line }: { line: TermsLine }) {
  return (
    <li
      className={`flex gap-2 text-sm leading-relaxed text-text-2 ${
        line.level === 1 ? "pl-4 sm:pl-6" : ""
      }`}
    >
      {line.marker && (
        <span className="shrink-0 font-semibold text-text-3">{line.marker}</span>
      )}
      <span>{line.text}</span>
    </li>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text-1 sm:text-3xl">
          서비스 이용약관
        </h1>
        <p className="mt-2 text-sm text-text-3">
          포카스테이션(Poca Station) · K-POP 포토카드 경매 · 중고거래 중개 플랫폼
        </p>
        <p className="mt-1 text-xs text-text-3">시행일 {TERMS_EFFECTIVE_DATE}</p>
      </header>

      {/* 전자상거래법 §20 — 약관에도 중개자 지위를 명시한다(본문 제20조와 동일 취지의 요약 고지). */}
      <p className="mt-6 rounded-r3 border border-border bg-surface-2 px-4 py-3 text-sm leading-relaxed text-text-2">
        {INTERMEDIARY_NOTICE}
      </p>

      <nav aria-label="목차" className="mt-8 rounded-r3 border border-border p-4 sm:p-5">
        <h2 className="text-sm font-bold text-text-1">목차</h2>
        <div className="mt-3 space-y-3">
          {TERMS_CHAPTERS.map((chapter) => (
            <div key={chapter.title}>
              <p className="text-xs font-bold text-text-3">{chapter.title}</p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {chapter.articles.map((article) => (
                  <li key={article.no}>
                    <a
                      href={`#${anchorOf(article.no)}`}
                      className={`rounded-r1 text-xs text-text-2 transition-colors hover:text-primary ${FOCUS_RING}`}
                    >
                      {article.no} {article.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-10 space-y-10">
        {TERMS_CHAPTERS.map((chapter) => (
          <section key={chapter.title}>
            <h2 className="border-b border-border pb-2 font-display text-lg font-extrabold text-text-1">
              {chapter.title}
            </h2>
            <div className="mt-5 space-y-6">
              {chapter.articles.map((article) => (
                <article key={article.no} id={anchorOf(article.no)} className="scroll-mt-24">
                  <h3 className="text-sm font-bold text-text-1">
                    {article.no} ({article.title})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {article.lines.map((line, index) => (
                      <TermsLineRow key={index} line={line} />
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-border pt-5 text-sm font-semibold text-text-1">
        {TERMS_ADDENDUM}
      </p>
    </div>
  );
}
