import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExchangeCta from "@/components/ExchangeCta";
import ExchangeMoreMenu from "@/components/ExchangeMoreMenu";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch, ApiError, mediaUrl } from "@/lib/api";
import { itemName, itemSource, slotLabel } from "@/lib/exchange-labels";
import { FORM_ACTION_BAR, FORM_ACTION_BAR_PAD, FORM_ACTION_BAR_STYLE } from "@/lib/ui";
import type { ExchangePostDetail } from "@/lib/types";

/**
 * 교환글 상세(#662).
 *
 * <p>정보를 <code>라벨 | 값</code> 표 하나로 늘어놓지 않는다. 포카 이름은 <b>제목</b>, 교환 방향은
 * <b>세로선으로 가른 두 칸</b>, 만날 곳은 <b>회색 띠</b>다 — 성격이 다른 셋이 서로 다른 지면에 앉는다.
 *
 * <p>신고 진입점은 더보기(⋮) 하나로 모은다 — 사이렌을 본문에 띄우면 화면에서 가장 센 신호가
 * 신고가 된다. 자세한 근거는 {@link ExchangeMoreMenu}.
 *
 * <p>하단 버튼은 클라이언트가 그린다({@link ExchangeCta}). 이 페이지는 서버 컴포넌트라 사용자
 * 토큰이 없어 역할을 알 수 없다.
 */

async function getPost(id: string): Promise<ExchangePostDetail | null> {
  try {
    return await apiFetch<ExchangePostDetail>(`/api/exchanges/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  return { title: post ? `${itemName(post.have)} 교환` : "교환글" };
}

export default async function ExchangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    notFound();
  }

  const [cover, ...rest] = post.photos;

  return (
    <>
      <MobilePageHead
        title="교환글"
        sub={post.authorNickname ?? undefined}
        action={<ExchangeMoreMenu postId={post.id} authorNickname={post.authorNickname} />}
      />

      <div className={`mx-auto max-w-[760px] ${FORM_ACTION_BAR_PAD} sm:px-4 sm:py-8`}>
        {/* 모바일에서 높이를 묶는다. 예전에는 비율만 줘서 사진이 첫 화면의 절반을 넘었고(421/812),
            정작 「어디서 언제」가 고정 바에 가려 첫 화면에 들어오지 않았다(#718). */}
        {cover && (
          <div className="flex gap-1.5 px-[14px] pt-3 max-sm:h-[268px] sm:px-0">
            <div className="relative flex-[1.8] overflow-hidden rounded-r1 border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
              <img
                src={mediaUrl(cover.url)}
                alt=""
                className="h-full w-full object-cover sm:aspect-[1/1.18] sm:h-auto"
              />
            </div>
            {rest.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                {rest.map((photo) => (
                  <div key={photo.url} className="flex-1 overflow-hidden rounded-r1 border border-border bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
                    <img src={mediaUrl(photo.url)} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 제목이 교환 방향을 말한다. 예전에는 「슬기」 + 「레드벨벳 · 공개방송 · A급」이었는데
            바로 아래 패널 왼쪽 칸과 글자까지 같았다(#718). 세부는 패널이 맡는다. */}
        <div className="flex items-start gap-2 px-[14px] pt-4 sm:px-0">
          <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-xl font-extrabold tracking-[-0.028em] text-text-1">
            <span className="truncate">{itemName(post.have)}</span>
            <span aria-label="교환" className="shrink-0 text-sm font-semibold text-text-3">→</span>
            <span className="truncate text-primary">{post.wants.map(itemName).join(" · ") || "—"}</span>
          </h1>
          {/* 데스크톱에는 앱바가 없다(sm:hidden) — 진입점이 사라지지 않게 제목 줄에 한 번 더 둔다. */}
          <div className="max-sm:hidden">
            <ExchangeMoreMenu postId={post.id} authorNickname={post.authorNickname} />
          </div>
        </div>

        {/* 이름은 제목이 말했다. 여기는 출처와 등급만 맡는다 — 이 화면에서 유일한 강조 패널이다. */}
        <div className="px-[14px] pt-3 sm:px-0">
          <div className="flex overflow-hidden rounded-r2 border border-border-2">
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-[10px] font-extrabold tracking-[0.04em] text-text-3">내가 줄 것</p>
              <p className="mt-1 truncate text-[12.5px] font-bold text-text-2">{itemSource(post.have)}</p>
              {post.have?.grade && (
                <span className="mt-1.5 inline-block rounded-[3px] border border-border-2 px-1.5 py-px text-[10.5px] font-extrabold text-text-2">
                  {post.have.grade}급
                </span>
              )}
            </div>
            <div aria-hidden="true" className="w-px bg-border-2" />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-[10px] font-extrabold tracking-[0.04em] text-text-3">받고 싶은 것</p>
              <p className="mt-1 truncate text-[12.5px] font-bold text-text-2">
                {post.wants.map(itemSource).join(" · ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 회색 띠를 걷었다(#718). 그 회색은 안내 상자와 섹션 구분띠가 쓰는 보조 지면인데, 만날 곳과
            시간은 이 글에서 「지금 무엇을 할지」를 정하는 값이다. 지면은 헤어라인 하나로 가른다. */}
        <div className="mt-5 px-[14px] sm:px-0">
          <div className="border-t border-border pt-3.5">
            <div className="flex items-baseline gap-2">
              <p className="w-[52px] shrink-0 text-[11.5px] font-extrabold text-text-3">만날 곳</p>
              <p className="min-w-0 text-[15px] font-extrabold tracking-[-0.018em] text-text-1">{post.place}</p>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <p className="w-[52px] shrink-0 text-[11.5px] font-extrabold text-text-3">시간</p>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {post.slots.map((slot) => (
                  <span
                    key={slot.id}
                    className="rounded-[3px] border border-border-2 px-2.5 py-[5px] text-xs font-bold text-text-1"
                  >
                    {slotLabel(slot)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 하단은 버튼 한 자리다. 무엇이 앉을지는 보는 사람의 역할이 정한다 — ExchangeCta 참고.
            모바일에서는 화면 아래에 고정한다(하단 5탭 위). 사진·품목·시간대를 지나 끝까지
            굴려야 다음 걸음에 닿는 화면이었다. */}
        <div className={FORM_ACTION_BAR} style={FORM_ACTION_BAR_STYLE}>
          <ExchangeCta
            postId={post.id}
            status={post.status}
            eventId={post.eventId}
            expiresAt={post.expiresAt}
          />
        </div>
      </div>
    </>
  );
}
