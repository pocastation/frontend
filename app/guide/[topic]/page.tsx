import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GradeStandard from "@/components/GradeStandard";
import {
  GRADE_RAMP,
  GRADE_SCALE,
  GRADE_COLOR,
  GUIDE_DOCS,
  GUIDE_GROUPS,
  findGuideDoc,
  findGuideGroup,
} from "@/lib/guide-content";
import { FOCUS_RING } from "@/lib/ui";

export function generateStaticParams() {
  return GUIDE_DOCS.map((d) => ({ topic: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const doc = findGuideDoc(topic);
  if (!doc) return { title: "이용 가이드" };
  return { title: `${doc.title} — 이용 가이드`, description: doc.lead ?? doc.desc };
}

/**
 * 가이드 문서 한 편(#437).
 *
 * <p>순서가 규칙이다 — <b>사실 표 → 본문</b>. 「기한이 며칠이더라」로 온 사람이 스크롤하지
 * 않고 답을 얻어야 한다. 본문을 먼저 두면 그 사람은 읽지 않고 나간다.
 *
 * <p>데스크탑에서는 왼쪽에 목차를 세운다. <b>문서 사이를 오가는 것이 이 화면의 주 동작</b>이라
 * 매번 뒤로 가게 두면 읽는 흐름이 끊긴다. 모바일은 목차 대신 문서 끝에 같은 그룹을 붙인다.
 */
export default async function GuideDocPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const doc = findGuideDoc(topic);
  if (!doc) notFound();
  const group = findGuideGroup(topic);

  return (
    <div className="mx-auto max-w-[980px] px-5 pt-8 pb-16 sm:pt-12">
      <div className="grid gap-8 sm:grid-cols-[190px_1fr] sm:gap-9">
        {/* 목차 — 모바일에서는 숨기고 문서 끝의 「같은 그룹」이 그 역할을 한다. */}
        <nav aria-label="이용 가이드 문서" className="hidden self-start sm:block">
          <Link
            href="/guide"
            className={`inline-flex items-center gap-1 text-[12.5px] font-bold text-text-3 transition-colors hover:text-text-1 ${FOCUS_RING}`}
          >
            <span aria-hidden="true">←</span> 이용 가이드
          </Link>
          {GUIDE_GROUPS.map((g) => (
            <div key={g.title} className="mt-5">
              <p className="font-display text-[11px] font-extrabold tracking-[0.08em] text-text-3">
                {g.title}
              </p>
              <ul className="mt-1.5">
                {g.ids.map((id) => {
                  const d = findGuideDoc(id);
                  if (!d) return null;
                  const on = id === topic;
                  return (
                    <li key={id}>
                      <Link
                        href={`/guide/${id}`}
                        aria-current={on ? "page" : undefined}
                        className={`-ml-[11px] block border-l-2 py-1.5 pl-[9px] text-[13px] transition-colors ${FOCUS_RING} ${
                          on
                            ? "border-primary font-bold text-text-1"
                            : "border-transparent text-text-2 hover:text-text-1"
                        }`}
                      >
                        {d.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <article className="min-w-0">
          <Link
            href="/guide"
            className={`inline-flex items-center gap-1 text-[12.5px] font-bold text-text-3 transition-colors hover:text-text-1 sm:hidden ${FOCUS_RING}`}
          >
            <span aria-hidden="true">←</span> 이용 가이드
          </Link>

          <header className="mt-4 sm:mt-0">
            {group && (
              <p className="font-display text-[11.5px] font-extrabold tracking-[0.08em] text-text-3">
                {group.title}
              </p>
            )}
            <h1 className="mt-2 font-display text-[22px] font-extrabold leading-[1.3] tracking-[-0.04em] text-text-1 sm:text-[28px]">
              {doc.title}
            </h1>
            {doc.lead && (
              <p className="mt-2.5 max-w-[30rem] break-keep text-[15px] leading-[1.8] text-text-2">
                {doc.lead}
              </p>
            )}
          </header>

          {/* 사실 표 — 위 규칙선을 굵게(2px) 둬서 본문과 다른 성격임을 형태로 말한다. */}
          {doc.facts && (
            <dl className="mt-5 max-w-[520px] border-t-2 border-text-1">
              {doc.facts.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-3.5 border-b border-border py-2.5"
                >
                  <dt className="shrink-0 whitespace-nowrap text-[13px] text-text-3">{k}</dt>
                  <dd className="break-keep text-right font-display text-[14px] font-extrabold tracking-[-0.02em] tabular-nums text-text-1">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* 등급 척도 — 네 단계가 한 줄 위에서 이어져야 「S에서 C로 나빠진다」가 읽힌다. */}
          {doc.scale && (
            <div className="mt-5 max-w-[520px]">
              <div className="h-[5px]" style={{ background: GRADE_RAMP }} />
              <div className="grid grid-cols-4 gap-[3px] pt-2">
                {GRADE_SCALE.map(([g, label]) => (
                  <span key={g}>
                    <span
                      className="block font-display text-[14px] font-extrabold"
                      style={{ color: GRADE_COLOR[g] }}
                    >
                      {g}
                    </span>
                    <span className="mt-px block text-[11.5px] text-text-3">{label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {doc.shots && (
            <div className="mt-5">
              <p className="text-[12.5px] text-text-3">필수 4컷</p>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {doc.shots.map((c) => (
                  <span key={c} className="w-24 shrink-0">
                    <span className="block aspect-[1/1.4] border border-border bg-surface-2" />
                    <span className="block pt-1.5 text-[11.5px] font-bold text-text-2">{c}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 🔴 소제목 앞에 보라 세로 띠(`w-[3px] bg-primary`)를 세웠었다. 문서마다 5~7번,
              문서 7개에 걸쳐 같은 조각이 반복돼 **AI가 만든 화면**으로 읽혔다(#437 리뷰).
              CLAUDE.md의 두 규칙을 동시에 어긴 자리이기도 하다 — 좌측 규칙선은 진짜 경고에만
              쓰고, 보라는 상태를 말하는 자리에만 쓴다(제목에는 쓰지 않는다).

              띠를 걷고 **크기·색 대비**로 묶는다. 라벨은 작고 흐리게, 본문은 크고 진하게 —
              장식을 하나도 쓰지 않고도 「이 문장의 제목」이라는 관계가 읽힌다. 같은 페이지
              아래쪽 GradeStandard의 절 제목과도 같은 형태가 된다. */}
          <div className="mt-6 flex flex-col gap-7 border-t border-border pt-6">
            {doc.sections.map(([h, b]) => (
              <section key={h}>
                <h2 className="font-display text-[12px] font-extrabold tracking-[0.06em] text-text-3">
                  {h}
                </h2>
                <p className="mt-2 max-w-[36rem] break-keep text-[16px] leading-[1.82] tracking-[-0.012em] text-text-1">
                  {b}
                </p>
              </section>
            ))}
          </div>

          {doc.standalone && <GradeStandard />}

          {/* 같은 그룹의 다른 문서 — 모바일에서 목차를 대신한다. */}
          {group && group.ids.length > 1 && (
            <section className="mt-8 bg-surface-2 px-4 pb-5 pt-4 sm:hidden">
              <h2 className="font-display text-[11.5px] font-extrabold tracking-[0.08em] text-text-3">
                {group.title}
              </h2>
              <ul className="mt-2">
                {group.ids
                  .filter((id) => id !== topic)
                  .map((id, i) => {
                    const d = findGuideDoc(id);
                    if (!d) return null;
                    return (
                      <li key={id} className={i ? "border-t border-border-2" : ""}>
                        <Link
                          href={`/guide/${id}`}
                          className={`flex min-h-[52px] items-center justify-between gap-2.5 py-2.5 text-[15px] font-bold tracking-[-0.02em] text-text-1 ${FOCUS_RING}`}
                        >
                          <span className="min-w-0 flex-1">{d.title}</span>
                          <span aria-hidden="true" className="shrink-0 text-text-3">
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          <section className="mt-8 border-t border-border pt-6">
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
        </article>
      </div>
    </div>
  );
}
