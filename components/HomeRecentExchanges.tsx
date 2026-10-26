import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { itemName, slotLabel } from "@/lib/exchange-labels";
import { FOCUS_RING, PRESS_ROW } from "@/lib/ui";
import type { RecentExchangeItem } from "@/lib/types";

/**
 * 홈의 최근 교환글(#804, BE #574).
 *
 * <p>행사 피드의 줄({@link ExchangeFeedRow})과 같은 생김새를 쓴다 — 같은 것을 두 가지로
 * 그리면 교환글이 두 종류인 것처럼 읽힌다. 다른 점은 한 줄뿐이다. 홈은 여러 행사가 섞이므로
 * <b>어느 날 어느 방송인지</b>를 함께 적는다.
 *
 * <p>마감 배지를 달지 않는다. 홈에 올리는 것은 가장 최근 몇 건이고, 마감된 글이 그 안에
 * 들어올 일이 거의 없다. 들어와도 상세에서 막힌다.
 */
export default function HomeRecentExchanges({ posts }: { posts: RecentExchangeItem[] }) {
  return (
    <section className="px-gutter pt-section sm:mx-auto sm:max-w-[1160px] sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title-s font-extrabold sm:font-display sm:text-title">최근 올라온 교환글</h2>
        <Link href="/events" className={`flex items-center gap-1 text-label font-semibold text-text-3 ${FOCUS_RING}`}>
          더보기
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {posts.length > 0 ? (
        // 데스크탑은 1160px 한 줄에 글 하나만 깔면 줄이 너무 길다. 두 칸으로 접는다.
        <ul className="mt-head sm:grid sm:grid-cols-2 sm:gap-x-10">
          {posts.map((post) => (
            <Row key={post.id} post={post} />
          ))}
        </ul>
      ) : (
        /* 섹션을 숨기지 않는다. 가오픈 첫날은 반드시 0건이고, 블록이 통째로 없으면 홈이
           캘린더와 안내문만 남아 「아직 아무것도 없는 서비스」로 읽힌다. */
        <p className="py-8 text-center text-body-s leading-relaxed text-text-3">
          아직 올라온 교환글이 없어요
          <br />
          행사를 고르면 첫 글을 올릴 수 있어요
        </p>
      )}
    </section>
  );
}

function Row({ post }: { post: RecentExchangeItem }) {
  const firstSlot = post.slots[0];
  const wants = post.wants.map(itemName).join(" · ");

  return (
    <li className="border-b border-border">
      <Link
        href={`/exchanges/${post.id}`}
        className={`-mx-2 flex gap-3 rounded-control px-2 py-3 ${PRESS_ROW} ${FOCUS_RING}`}
      >
        <span className="relative block h-[62px] w-[52px] shrink-0">
          {post.photoCount > 1 && (
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-x-[5px] -translate-y-[3px] rotate-[5deg] rounded-control border border-border bg-surface-2"
            />
          )}
          <span className="absolute inset-0 overflow-hidden rounded-control border border-border bg-surface-2">
            {post.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
              <img
                src={mediaUrl(post.thumbnailUrl)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </span>
          {post.photoCount > 1 && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-control bg-text-1 px-1 font-display text-caption font-extrabold text-white">
              {post.photoCount}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-body-l font-extrabold text-text-1">
            <span className="truncate">{post.have ? itemName(post.have) : "—"}</span>
            <span aria-label="교환" className="shrink-0 text-label font-semibold text-text-3">
              →
            </span>
            <span className="truncate text-primary">{wants || "—"}</span>
          </span>
          {post.eventName && (
            <span className="mt-1 block truncate text-label font-semibold text-text-2">
              {eventLabel(post.eventDate)}
              {post.eventName}
            </span>
          )}
          <span className="mt-1 block truncate text-label text-text-3">
            {firstSlot ? `${slotLabel(firstSlot)} · ` : ""}
            {post.place}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** 「10월 29일 」까지. 연도는 적지 않는다 — 홈에 오는 것은 2주 안의 행사뿐이다. */
function eventLabel(eventDate: string | null): string {
  if (!eventDate) return "";
  const [, month, day] = eventDate.split("-");
  return `${Number(month)}월 ${Number(day)}일 `;
}
