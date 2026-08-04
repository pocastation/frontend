import { BUSINESS_INFO } from "@/lib/business";
import {
  PRIVACY_AGENCIES,
  PRIVACY_ARTICLES,
  PRIVACY_EFFECTIVE_DATE,
  type PrivacyArticle,
} from "@/lib/privacy-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = { title: "개인정보처리방침 — Pocastation" };

// 조문 앵커 — 목차에서 바로 이동한다. 약관 페이지(app/terms)와 같은 규칙을 쓴다.
function anchorOf(no: string) {
  return `article-${no.replace(/[^0-9]/g, "")}`;
}

function ArticleBody({ article }: { article: PrivacyArticle }) {
  return (
    <>
      {article.paragraphs?.map((p) => (
        <p key={p} className="mt-2 text-sm leading-relaxed text-text-2">
          {p}
        </p>
      ))}

      {article.table && (
        // 표는 좁은 화면에서 반드시 넘친다. 페이지 본문이 가로로 밀리지 않게
        // 표만 자기 컨테이너 안에서 스크롤하게 둔다.
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-y border-border-2">
                {article.table.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-bold text-text-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {article.table.rows.map((row) => (
                <tr key={row[0]} className="border-b border-border align-top">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2.5 leading-relaxed ${
                        i === 0 ? "font-bold whitespace-nowrap text-text-1" : "text-text-2"
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
      )}

      {article.bullets && (
        <ul className="mt-3 space-y-1.5">
          {article.bullets.map((b) => (
            <li key={b.text} className="flex gap-2 text-sm leading-relaxed text-text-2">
              <span aria-hidden="true" className="shrink-0 text-text-3">
                ·
              </span>
              <span>
                {b.label && <b className="font-bold text-text-1">{b.label} — </b>}
                {b.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text-1 sm:text-3xl">
          개인정보처리방침
        </h1>
        <p className="mt-2 text-sm text-text-3">
          {BUSINESS_INFO.companyName}(Poca Station) · K-POP 포토카드 경매 · 중고거래 중개 플랫폼
        </p>
        <p className="mt-1 text-xs text-text-3">시행일 {PRIVACY_EFFECTIVE_DATE}</p>
      </header>

      <nav aria-label="목차" className="mt-8 rounded-r3 border border-border p-4 sm:p-5">
        <h2 className="text-sm font-bold text-text-1">목차</h2>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {PRIVACY_ARTICLES.map((a) => (
            <li key={a.no}>
              <a
                href={`#${anchorOf(a.no)}`}
                className={`rounded-r1 text-xs text-text-2 transition-colors hover:text-primary ${FOCUS_RING}`}
              >
                {a.no} {a.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-9">
        {PRIVACY_ARTICLES.map((article) => (
          <section key={article.no} id={anchorOf(article.no)} className="scroll-mt-24">
            <h2 className="border-b border-border pb-2 font-display text-base font-extrabold text-text-1">
              {article.no} ({article.title})
            </h2>
            <ArticleBody article={article} />

            {/* 침해 신고 기관은 보호책임자 조항에 딸린 정보다 — 별도 조문으로 세우면
                실제 방침의 조문 수와 어긋난다. */}
            {article.no === "제8조" && (
              <ul className="mt-3 space-y-1.5">
                {PRIVACY_AGENCIES.map((a) => (
                  <li key={a.name} className="flex flex-wrap gap-x-2 text-sm text-text-2">
                    <span className="font-bold text-text-1">{a.name}</span>
                    <span className="text-text-3">
                      {a.site} · ☎ {a.tel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-border pt-5 text-sm text-text-2">
        이 방침은 {PRIVACY_EFFECTIVE_DATE}부터 시행합니다. 문의는{" "}
        <a
          href={`mailto:${BUSINESS_INFO.email}`}
          className={`font-bold text-primary underline underline-offset-4 ${FOCUS_RING}`}
        >
          {BUSINESS_INFO.email}
        </a>
        로 주시면 됩니다.
      </p>
    </div>
  );
}
