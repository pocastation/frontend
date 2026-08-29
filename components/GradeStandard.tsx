import {
  GRADE_CASES,
  GRADE_COLOR,
  GRADE_DEFS,
  GRADE_EFFECT,
  GRADE_MATRIX,
  GRADE_NOTE,
  GRADE_PRINCIPLES,
  GRADE_SEALED,
  GRADE_STEPS,
  GRADE_TERMS,
} from "@/lib/guide-content";

/**
 * 상태 등급 기준표(#437) — 「알아두기 · 상태 등급 기준표」 문서의 본문 뒤에 이어 붙는다.
 *
 * <p>🔴 이 문서만 별도 컴포넌트인 이유는 <b>다른 문서보다 훨씬 크기 때문</b>이다. 판정 5단계,
 * 원칙 3개, 하자×등급 매트릭스, 용어 9개, 판정 사례 8개, 등급 정의 4개가 들어간다. 다른
 * 문서와 같은 「소제목 + 문단」 틀에 욱여넣으면 <b>스크롤만 긴 벽</b>이 된다.
 *
 * <p><b>지면을 절마다 달리 쓴다</b> — 절차는 번호 축, 원칙은 규칙선 카드, 매트릭스는 표,
 * 용어·사례는 정의 목록. 같은 골격을 반복하면 Notion 문서처럼 읽힌다(CLAUDE.md 디자인 절).
 *
 * <p>🔴 <b>매트릭스는 접지 않는다.</b> 이 화면에 들어오는 이유 자체다 — 「내 카드의 이 하자면
 * 몇 급인가」에 답하는 유일한 자리다.
 */
export default function GradeStandard() {
  return (
    <div className="mt-10">
      <p className="border-l-2 border-text-1 pl-3 text-[13px] leading-[1.75] text-text-2">
        {GRADE_NOTE}
      </p>

      {/* ── 판정 절차 ── 번호 축으로 순서를 만든다. 마지막 칸은 그 단계에서 잡히는 하자다. */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          판정 절차
        </h2>
        <ol className="mt-3">
          {GRADE_STEPS.map(([title, how, catches], i) => {
            const last = i === GRADE_STEPS.length - 1;
            return (
              <li key={title} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="flex shrink-0 flex-col items-center self-stretch">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-text-1 font-display text-[10.5px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  {!last && <span className="min-h-[14px] w-px flex-1 bg-border-2" />}
                </span>
                <span className={`min-w-0 flex-1 ${last ? "" : "pb-3.5"}`}>
                  <span className="block text-[15px] font-bold tracking-[-0.02em] text-text-1">
                    {title}
                  </span>
                  <span className="mt-0.5 block break-keep text-[13.5px] leading-relaxed text-text-2">
                    {how}
                  </span>
                  {catches && (
                    <span className="mt-1 block text-[12px] text-text-3">잡히는 하자 · {catches}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── 원칙 ── 절차와 다른 지면을 준다. 「어떻게 보는가」가 아니라 「어떻게 정하는가」다. */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          애매할 때의 3원칙
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {GRADE_PRINCIPLES.map(([name, rule, example]) => (
            <div key={name} className="border-l-2 border-primary pl-3.5">
              <p className="text-[14px] font-extrabold tracking-[-0.02em] text-text-1">{name}</p>
              <p className="mt-1 break-keep text-[13.5px] leading-[1.75] text-text-2">{rule}</p>
              <p className="mt-1 break-keep text-[12.5px] leading-relaxed text-text-3">{example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 등급 정의 ── */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          등급 정의
        </h2>
        <dl className="mt-3 border-t border-border">
          {GRADE_DEFS.map(([g, label, summary, detail]) => (
            <div key={g} className="border-b border-border py-3.5">
              <dt className="flex items-baseline gap-2">
                <span
                  className="font-display text-[16px] font-extrabold"
                  style={{ color: GRADE_COLOR[g] }}
                >
                  {g}
                </span>
                <span className="text-[14px] font-bold tracking-[-0.02em] text-text-1">{label}</span>
                <span className="min-w-0 flex-1 break-keep text-right text-[12px] text-text-3">
                  {summary}
                </span>
              </dt>
              <dd className="mt-1.5 break-keep text-[13.5px] leading-[1.75] text-text-2">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 🔴 하자 × 등급 ── 이 화면에 들어오는 이유 자체라 접지 않는다. */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          하자 유형별 허용 기준
        </h2>
        <p className="mt-1.5 text-[12.5px] text-text-3">
          그 하자가 있으면 <b className="font-bold text-text-2">고를 수 있는 등급</b>이에요.
        </p>
        {/* 표는 좁은 화면에서 가로로 스크롤한다 — 줄바꿈으로 뭉개면 대조가 안 된다. */}
        <div className="mt-3 -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-text-1">
                <th className="py-2 pr-3 text-[11.5px] font-bold text-text-3">하자</th>
                <th className="py-2 pr-3 text-[11.5px] font-bold text-text-3">판정 기준</th>
                <th className="py-2 text-right text-[11.5px] font-bold text-text-3">가능 등급</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_MATRIX.map(([defect, how, grades]) => (
                <tr key={defect} className="border-b border-border">
                  <td className="whitespace-nowrap py-2.5 pr-3 text-[13.5px] font-bold text-text-1">
                    {defect}
                  </td>
                  <td className="break-keep py-2.5 pr-3 text-[12.5px] leading-relaxed text-text-3">
                    {how ?? "—"}
                  </td>
                  <td className="whitespace-nowrap py-2.5 text-right">
                    {[...grades].map((g) => (
                      <span
                        key={g}
                        className="ml-1 font-display text-[13.5px] font-extrabold"
                        style={{ color: GRADE_COLOR[g] }}
                      >
                        {g}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 용어 ── */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          하자 용어
        </h2>
        <dl className="mt-3 flex flex-col gap-3.5">
          {GRADE_TERMS.map(([term, meaning]) => (
            <div key={term}>
              <dt className="text-[13.5px] font-extrabold tracking-[-0.02em] text-text-1">{term}</dt>
              <dd className="mt-0.5 break-keep text-[13.5px] leading-[1.75] text-text-2">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 판정 사례 ── 질문 형태라 다른 절과 지면이 달라진다. */}
      <section className="mt-9 bg-surface-2 px-4 pb-5 pt-4 sm:px-5">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          자주 묻는 판정 기준
        </h2>
        <dl className="mt-2.5">
          {GRADE_CASES.map(([q, a], i) => (
            <div key={q} className={i ? "border-t border-border-2 pt-3.5" : ""}>
              <dt className="break-keep text-[13.5px] font-bold text-text-1">{q}</dt>
              <dd className="mb-3.5 mt-1 break-keep text-[13px] leading-[1.75] text-text-2">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 미개봉 ── */}
      <section className="mt-9">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          미개봉 상품
        </h2>
        <p className="mt-2 max-w-[36rem] break-keep text-[14px] leading-[1.8] text-text-1">
          {GRADE_SEALED}
        </p>
      </section>

      {/* ── 어긋나면 ── 마지막에 둔다. 기준을 다 읽은 뒤라야 「그래서 어떻게 되나」가 읽힌다. */}
      <section className="mt-9 border-t border-border pt-6">
        <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
          기준과 다르게 적으면
        </h2>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {GRADE_EFFECT.map((line) => (
            <p key={line} className="max-w-[36rem] break-keep text-[13.5px] leading-[1.8] text-text-2">
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
