import { notFound } from "next/navigation";
import {
  POLICY_ADDENDUM,
  POLICY_CHAPTERS,
  POLICY_EFFECTIVE_DATE,
  POLICY_FLOW,
  POLICY_PUBLISHED,
  type PolicyLine,
  type PolicyTable,
} from "@/lib/policy-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = { title: "운영정책 — Pocastation" };

// 조문 앵커 — 목차에서 바로 이동한다. 약관 페이지와 같은 규칙을 쓴다.
function anchorOf(no: string) {
  return `article-${no.replace(/[^0-9]/g, "-").replace(/^-|-$/g, "")}`;
}

function PolicyLineRow({ line }: { line: PolicyLine }) {
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

/**
 * 조문 안의 표. 취소 기준·수수료처럼 표가 곧 본문인 조가 있어 약관 페이지에는 없는 요소다.
 *
 * 가로 스크롤 컨테이너로 감싼다 — 수수료 표는 열이 4개라 좁은 화면에서 본문을 밀어낸다.
 */
function PolicyTableBlock({ table }: { table: PolicyTable }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-y border-border">
            {table.head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 font-bold text-text-1">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-3 py-2 align-top leading-relaxed ${
                    cellIndex === 0 ? "font-semibold text-text-1" : "text-text-2"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PolicyPage() {
  // ⚠️ 문안 확정 전에는 URL을 알아도 열리지 않아야 한다. 링크를 빼는 것만으로는
  //    "게시하지 않았다"고 말할 수 없다 — 접근 가능하면 게시로 볼 여지가 있다.
  if (!POLICY_PUBLISHED) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text-1 sm:text-3xl">운영정책</h1>
        <p className="mt-2 text-sm text-text-3">
          포카스테이션(Poca Station) · 경매 · 즉시판매 거래 세부 기준
        </p>
        <p className="mt-1 text-xs text-text-3">시행일 {POLICY_EFFECTIVE_DATE}</p>
      </header>

      <p className="mt-6 rounded-r3 border border-border bg-surface-2 px-4 py-3 text-sm leading-relaxed text-text-2">
        이 정책은 이용약관이 위임한 하위 기준입니다. 여기서 정하지 않은 사항과 이 정책이 이용약관과
        어긋나는 부분은 이용약관을 따릅니다.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-text-1">거래의 전체 흐름</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-3">
          포카스테이션의 모든 거래는 아래 8단계를 따릅니다. 각 단계의 세부 규칙은 본문 각 장에서
          정합니다.
        </p>
        <PolicyTableBlock table={POLICY_FLOW} />
      </section>

      <nav aria-label="목차" className="mt-8 rounded-r3 border border-border p-4 sm:p-5">
        <h2 className="text-sm font-bold text-text-1">목차</h2>
        <div className="mt-3 space-y-3">
          {POLICY_CHAPTERS.map((chapter) => (
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
        {POLICY_CHAPTERS.map((chapter) => (
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
                  {article.lines && (
                    <ul className="mt-2 space-y-1.5">
                      {article.lines.map((line, index) => (
                        <PolicyLineRow key={index} line={line} />
                      ))}
                    </ul>
                  )}
                  {article.table && <PolicyTableBlock table={article.table} />}
                  {article.trailingLines && (
                    <ul className="mt-3 space-y-1.5">
                      {article.trailingLines.map((line, index) => (
                        <PolicyLineRow key={index} line={line} />
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-border pt-5 text-sm font-semibold text-text-1">
        {POLICY_ADDENDUM}
      </p>
    </div>
  );
}
