import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventExchangeFeed from "@/components/EventExchangeFeed";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import NavLink from "@/components/NavLink";
import { apiFetch, ApiError } from "@/lib/api";
import { kstHm, weekdayKo } from "@/lib/event-dates";
import { exchangeWindow } from "@/lib/exchange-labels";
import { feedApiQuery, parseTagQuery, type ExchangeTagQuery } from "@/lib/exchange-tags";
import {
  FOCUS_RING,
  FORM_ACTION_BAR,
  FORM_ACTION_BAR_PAD,
  FORM_ACTION_BAR_STYLE,
  PRESS_PRIMARY,
} from "@/lib/ui";
import type { EventResponse, ExchangeFeedResponse } from "@/lib/types";

/**
 * 행사 피드(#662). 캘린더에서 행사를 누르면 여기로 온다.
 *
 * <p><b>행사마다 게시판을 새로 열지 않는다.</b> 주간 방송 여섯 개에 출연팀을 곱하면 빈 게시판이
 * 수백 개 생긴다. 교환 피드 하나에 행사·스타 필터를 걸어 보여주고, 사용자가 느끼는 것은 같다.
 *
 * <p>필터는 쿼리로 건다. 상태로 들고 있으면 뒤로가기가 필터를 되돌리지 않고 화면을 떠나고,
 * 「에스파만 보는 목록」을 링크로 건네지도 못한다.
 */

async function getEvent(id: string): Promise<EventResponse | null> {
  try {
    return await apiFetch<EventResponse>(`/api/events/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function getFeed(id: string, tags: ExchangeTagQuery): Promise<ExchangeFeedResponse | null> {
  try {
    return await apiFetch<ExchangeFeedResponse>(`/api/events/${id}/exchanges${feedApiQuery(tags)}`, {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  return { title: event ? `${event.name} 교환` : "교환" };
}

export default async function EventFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ side?: string; artistIds?: string; idols?: string; artistId?: string }>;
}) {
  const { id } = await params;
  const tags = parseTagQuery(await searchParams);
  const event = await getEvent(id);
  if (!event) {
    notFound();
  }

  const feed = await getFeed(id, tags);
  const dateLabel = `${Number(event.eventDate.slice(5, 7))}월 ${Number(event.eventDate.slice(8, 10))}일 ${weekdayKo(event.eventDate)}요일`;
  const writeWindow = exchangeWindow(event.eventDate);

  return (
    <>
      <MobilePageHead title={event.name} sub={`${dateLabel} · ${event.venue}`} />

      <div className={`mx-auto max-w-[760px] ${FORM_ACTION_BAR_PAD} sm:px-4 sm:py-8`}>
        <div className="hidden sm:mb-5 sm:block">
          <h1 className="font-display text-title-l font-extrabold text-text-1">{event.name}</h1>
          <p className="mt-1 text-body-s text-text-3">
            {dateLabel} · {event.venue} · {kstHm(event.startsAt)}
          </p>
        </div>

        {event.status === "CANCELLED" && (
          <p className="mx-gutter mt-3 rounded-card bg-surface-2 px-4 py-3 text-body-s text-text-1 sm:mx-0">
            <b className="font-bold">휴방·취소된 회차예요.</b> 새 교환글은 올릴 수 없어요.
          </p>
        )}

        <EventExchangeFeed eventId={id} tags={tags} initialFeed={feed} />

        {/* 창 밖이면 버튼을 남기지 않는다(#722). 서버가 막는 것을 화면이 안 막으면 폼을 다 채운
            뒤에 400을 받는다 — #690과 같은 모양이다. 아직인지 이미 닫혔는지는 갈라서 말한다. */}
        {event.status !== "CANCELLED" && (
          <div className={FORM_ACTION_BAR} style={FORM_ACTION_BAR_STYLE}>
            {writeWindow === "open" ? (
              <NavLink
                nav="open"
                href={`/exchanges/new?eventId=${id}`}
                className={`flex h-12 items-center justify-center rounded-control bg-primary text-body-l font-extrabold text-white ${PRESS_PRIMARY} ${FOCUS_RING}`}
              >
                교환글 등록
              </NavLink>
            ) : (
              <p className="rounded-card bg-surface-2 px-3 py-4 text-center text-body-s font-semibold text-text-2">
                {writeWindow === "tooEarly"
                  ? "교환글은 행사 전날 낮 12시부터 올릴 수 있어요."
                  : "교환글을 올릴 수 있는 시간이 지났어요."}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
