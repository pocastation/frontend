import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExchangeCta from "@/components/ExchangeCta";
import ExchangeMoreMenu from "@/components/ExchangeMoreMenu";
import ExchangePhotoGallery from "@/components/ExchangePhotoGallery";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch, ApiError } from "@/lib/api";
import { itemName, itemSource, slotLabel } from "@/lib/exchange-labels";
import { tagQueryString } from "@/lib/exchange-tags";
import { FOCUS_RING, FORM_ACTION_BAR, FORM_ACTION_BAR_PAD, FORM_ACTION_BAR_STYLE, LABEL_NEUTRAL } from "@/lib/ui";
import type { ExchangePostDetail } from "@/lib/types";

// 판매글 상세(app/auctions/[id])의 해시태그 칩과 같은 모양. 헤어라인에 보라 글자다.
const HASHTAG_CLASS = `rounded-control border border-border px-2 py-1 text-label font-bold text-primary transition-colors hover:border-primary ${FOCUS_RING}`;

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

  return (
    <>
      <MobilePageHead
        title="교환글"
        sub={post.authorNickname ?? undefined}
        action={<ExchangeMoreMenu postId={post.id} authorNickname={post.authorNickname} />}
      />

      <div className={`mx-auto max-w-[760px] ${FORM_ACTION_BAR_PAD} sm:px-4 sm:py-8`}>
        {post.photos.length > 0 && (
          <div className="px-gutter pt-3 sm:px-0">
            <ExchangePhotoGallery photos={post.photos} title="교환글" />
          </div>
        )}

        {/* 제목이 교환 방향을 말한다. 예전에는 「슬기」 + 「레드벨벳 · 공개방송 · A급」이었는데
            바로 아래 패널 왼쪽 칸과 글자까지 같았다(#718). 세부는 패널이 맡는다. */}
        {/* 해시태그(#826). 판매글 상세와 같은 헤어라인 칩이고, 누르면 이 행사에서 같은 포카를 내놓은
            글을 태그로 찾는다. 태그는 이 글이 건네는 포카다 — 판매글의 태그가 파는 상품인 것과 같다. */}
        {post.have && (
          <div className="flex flex-wrap gap-2 px-gutter pt-4 sm:px-0">
            <Link
              href={`/events/${post.eventId}${tagQueryString({ side: "HAVE", artistIds: [post.have.artistId], idols: [] })}`}
              className={HASHTAG_CLASS}
            >
              #{post.have.artistName ?? "알 수 없음"}
            </Link>
            {post.have.idolId !== null && post.have.idolName && (
              <Link
                href={`/events/${post.eventId}${tagQueryString({
                  side: "HAVE",
                  artistIds: [],
                  idols: [{ artistId: post.have.artistId, idolId: post.have.idolId }],
                })}`}
                className={HASHTAG_CLASS}
              >
                #{post.have.idolName}
              </Link>
            )}
          </div>
        )}

        <div className={`flex items-start gap-2 px-gutter sm:px-0 ${post.have ? "pt-2" : "pt-4"}`}>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 text-title font-extrabold text-text-1">
            <span className="truncate">{itemName(post.have)}</span>
            <span aria-label="교환" className="shrink-0 text-body font-semibold text-text-3">→</span>
            <span className="truncate text-primary">{post.wants.map(itemName).join(" · ") || "—"}</span>
          </h1>
          {/* 데스크톱에는 앱바가 없다(sm:hidden) — 진입점이 사라지지 않게 제목 줄에 한 번 더 둔다. */}
          <div className="max-sm:hidden">
            <ExchangeMoreMenu postId={post.id} authorNickname={post.authorNickname} />
          </div>
        </div>

        {/* 이름은 제목이 말했다. 여기는 출처와 등급만 맡는다 — 이 화면에서 유일한 강조 패널이다. */}
        <div className="px-gutter pt-3 sm:px-0">
          <div className="flex overflow-hidden rounded-control border border-border-2">
            <div className="min-w-0 flex-1 px-3 py-3">
              <p className="text-caption font-extrabold tracking-[0.04em] text-text-3">내가 줄 것</p>
              <p className="mt-1 truncate text-body-s font-bold text-text-2">{itemSource(post.have)}</p>
              {post.have?.grade && (
                <span className={`mt-2 ${LABEL_NEUTRAL}`}>
                  {post.have.grade}급
                </span>
              )}
            </div>
            <div aria-hidden="true" className="w-px bg-border-2" />
            <div className="min-w-0 flex-1 px-3 py-3">
              <p className="text-caption font-extrabold tracking-[0.04em] text-text-3">받고 싶은 것</p>
              <p className="mt-1 truncate text-body-s font-bold text-text-2">
                {post.wants.map(itemSource).join(" · ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 회색 띠를 걷었다(#718). 그 회색은 안내 상자와 섹션 구분띠가 쓰는 보조 지면인데, 만날 곳과
            시간은 이 글에서 「지금 무엇을 할지」를 정하는 값이다. 지면은 헤어라인 하나로 가른다. */}
        <div className="mt-5 px-gutter sm:px-0">
          <div className="border-t border-border pt-4">
            <div className="flex items-baseline gap-2">
              <p className="w-[52px] shrink-0 text-label font-extrabold text-text-3">만날 곳</p>
              <p className="min-w-0 text-body-l font-extrabold text-text-1">{post.place}</p>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="w-[52px] shrink-0 text-label font-extrabold text-text-3">시간</p>
              <div className="flex min-w-0 flex-wrap gap-2">
                {post.slots.map((slot) => (
                  <span
                    key={slot.id}
                    className="rounded-control border border-border-2 px-3 py-2 text-label font-bold text-text-1"
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
