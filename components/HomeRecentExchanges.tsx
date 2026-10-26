import Link from "next/link";
import { tradeLine } from "@/lib/exchange-labels";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { RecentExchangeItem } from "@/lib/types";

/**
 * 홈의 최근 교환글(#798, BE #570).
 *
 * <p><b>0건이면 아무것도 그리지 않는다.</b> 가오픈 첫날은 0건이 정상인데 「아직 없어요」를
 * 띄우면 블록을 안 두느니만 못하다. 글이 쌓이면 저절로 나타난다.
 *
 * <p>행사 이름과 날짜를 함께 보여 주는 것이 행사 안에서 보는 피드와 다른 점이다 — 여러
 * 행사가 섞여 내려오므로 어느 날 어느 방송 앞인지가 그 줄의 전부다.
 *
 * <p>교환글 작성 창이 행사 전날 낮 12시부터라, 여기 뜨는 글은 거의 오늘·내일 행사 것이다.
 */
export default function HomeRecentExchanges({
  posts,
  variant,
}: {
  posts: RecentExchangeItem[];
  variant: "mobile" | "desktop";
}) {
  if (posts.length === 0) {
    return null;
  }
  return variant === "mobile" ? <MobileList posts={posts} /> : <DesktopGrid posts={posts} />;
}

function Head() {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-title-s font-extrabold text-text-1">최근 올라온 교환글</h2>
      <Link href="/events" className={`text-label font-semibold text-text-3 ${FOCUS_RING}`}>
        전체 보기
      </Link>
    </div>
  );
}

function MobileList({ posts }: { posts: RecentExchangeItem[] }) {
  return (
    <section className="px-gutter pt-section">
      <Head />
      <div className="mt-head flex flex-col gap-4">
        {posts.map((post) => (
          <Row key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function Row({ post }: { post: RecentExchangeItem }) {
  const trade = tradeLine(post.have, post.wants);
  return (
    <Link href={`/exchanges/${post.id}`} className={`flex gap-3 rounded-card ${FOCUS_RING}`}>
      <Thumb url={post.thumbnailUrl} className="h-19 w-16" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption font-bold text-text-2">{eventLine(post)}</p>
        <p className="mt-1 truncate text-body font-extrabold text-text-1">{trade.have}</p>
        <p className="mt-1 truncate text-body-s text-text-2">원해요 · {trade.wants}</p>
      </div>
    </Link>
  );
}

function DesktopGrid({ posts }: { posts: RecentExchangeItem[] }) {
  return (
    <section className="border-t border-border pt-section-ruled">
      <Head />
      <div className="mt-head grid grid-cols-4 gap-group">
        {posts.slice(0, 4).map((post) => (
          <Card key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function Card({ post }: { post: RecentExchangeItem }) {
  const trade = tradeLine(post.have, post.wants);
  return (
    <Link href={`/exchanges/${post.id}`} className={`block rounded-card ${FOCUS_RING}`}>
      <Thumb url={post.thumbnailUrl} className="aspect-4/5 w-full" />
      <p className="mt-head truncate text-caption font-bold text-text-2">{eventLine(post)}</p>
      <p className="mt-1 truncate text-body font-extrabold text-text-1">{trade.have}</p>
      <p className="mt-1 truncate text-body-s text-text-2">원해요 · {trade.wants}</p>
    </Link>
  );
}

function Thumb({ url, className }: { url: string | null; className: string }) {
  if (!url) {
    return <span aria-hidden="true" className={`shrink-0 rounded-control bg-surface-2 ${className}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
    <img src={mediaUrl(url)} alt="" className={`shrink-0 rounded-control bg-surface-2 object-cover ${className}`} />
  );
}

/** 「10월 29일 엠카운트다운」. 행사가 지워진 글은 날짜 없이 둔다 — 빈 줄을 만들지 않는다. */
function eventLine(post: RecentExchangeItem): string {
  if (!post.eventName) {
    return "행사 정보 없음";
  }
  if (!post.eventDate) {
    return post.eventName;
  }
  const [, month, day] = post.eventDate.split("-");
  return `${Number(month)}월 ${Number(day)}일 ${post.eventName}`;
}
