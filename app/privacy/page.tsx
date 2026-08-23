import { BUSINESS_INFO } from "@/lib/business";
import {
  PRIVACY_AGENCIES,
  PRIVACY_ANNOUNCED_DATE,
  PRIVACY_ARTICLES,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_HISTORY,
  type PrivacyBlock,
  type PrivacyBullet,
  type PrivacyTable,
} from "@/lib/privacy-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = { title: "개인정보 처리방침 — Pocastation" };

// 조문 앵커 — 목차에서 바로 이동한다. 약관 페이지(app/terms)와 같은 규칙을 쓴다.
function anchorOf(no: string) {
  return `article-${no.replace(/[^0-9]/g, "")}`;
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p) => (
        <p key={p} className="mt-2 text-sm leading-relaxed text-text-2">
          {p}
        </p>
      ))}
    </>
  );
}

function Bullets({ items }: { items: PrivacyBullet[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((b) => (
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
  );
}

function Table({ table }: { table: PrivacyTable }) {
  // 표는 좁은 화면에서 반드시 넘친다. 페이지 본문이 가로로 밀리지 않게
  // 표만 자기 컨테이너 안에서 스크롤하게 둔다. 열 수가 조문마다 달라(2~5열)
  // 최소 너비를 열 수로 잡는다 — 고정값이면 5열 표에서 글자가 뭉갠다.
  const minWidth = Math.max(480, table.head.length * 170);

  return (
    <div className="mt-3 overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-[12.5px]"
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-y border-border-2">
            {table.head.map((h) => (
              <th key={h} className="px-3 py-2 font-bold text-text-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-b border-border align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-2.5 leading-relaxed ${
                    i === 0 ? "font-bold text-text-1" : "text-text-2"
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

function Block({ block }: { block: PrivacyBlock }) {
  return (
    <div className="mt-6 first:mt-4">
      {block.heading && (
        <h3 className="text-sm font-bold text-text-1">{block.heading}</h3>
      )}

      {/* 아직 시행되지 않은 내용은 정보주체가 오인하지 않도록 규칙선으로 떼어 놓는다.
          페이지 전체에서 이 강조를 쓰는 곳은 여기뿐이다. */}
      {block.note && (
        <p className="mt-2 border-l-2 border-border-2 pl-3 text-[13px] leading-relaxed text-text-2">
          {block.note}
        </p>
      )}

      {block.paragraphs && <Paragraphs items={block.paragraphs} />}
      {block.table && <Table table={block.table} />}
      {block.bullets && <Bullets items={block.bullets} />}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:py-14">
      <header>
        {/* 법 §30② — "개인정보 처리방침"이라는 명칭을 쓰되 글자 크기·색상으로
            다른 고지사항과 구분해 정보주체가 쉽게 확인할 수 있어야 한다. */}
        <h1 className="font-display text-2xl font-extrabold text-text-1 sm:text-3xl">
          개인정보 처리방침
        </h1>
        <p className="mt-2 text-sm text-text-3">
          {BUSINESS_INFO.companyName}(Poca Station) · K-POP 포토카드 중고거래 중개 플랫폼
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-3">
          <div className="flex gap-1.5">
            <dt>개정 공고일</dt>
            <dd className="text-text-2">{PRIVACY_ANNOUNCED_DATE}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>시행일</dt>
            <dd className="font-bold text-text-1">{PRIVACY_EFFECTIVE_DATE}</dd>
          </div>
        </dl>
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

            {article.paragraphs && <Paragraphs items={article.paragraphs} />}
            {article.table && <Table table={article.table} />}
            {article.bullets && <Bullets items={article.bullets} />}
            {article.blocks?.map((block) => (
              <Block key={block.heading ?? block.paragraphs?.[0]} block={block} />
            ))}

            {/* 권익침해 구제방법은 보호책임자 조항에 딸린 정보다 — 별도 조문으로 세우면
                실제 방침의 조문 수와 어긋난다. */}
            {article.no === "제10조" && (
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

            {/* 개정 이력은 변경 조항에 붙는다. 이전 버전에 동의한 정보주체가
                "무엇에 동의했는지" 확인할 수 있어야 한다(법 §30② 지속 게재). */}
            {article.no === "제11조" && PRIVACY_HISTORY.length > 0 && (
              <ul className="mt-3 space-y-1">
                {PRIVACY_HISTORY.map((h) => (
                  <li key={h.period} className="text-sm text-text-3">
                    {h.period} 적용
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
