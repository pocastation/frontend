import type { Metadata } from "next";
import Link from "next/link";
import EventCalendar from "@/components/EventCalendar";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch } from "@/lib/api";
import { currentMonth, monthBounds, monthLabel, shiftMonth, ymd } from "@/lib/event-dates";
import { FOCUS_RING } from "@/lib/ui";
import type { EventListResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "행사 캘린더",
  description: "음악방송과 공연 일정을 한눈에 봐요.",
};

/**
 * 행사 캘린더(#659).
 *
 * <p>달 이동은 쿼리로 한다. 상태로 들고 있으면 뒤로가기가 달을 되돌리지 않고 화면을 통째로 떠나고,
 * 특정 달을 링크로 건네지도 못한다.
 *
 * <p>한 달치를 서버에서 받아 넘기고 날짜 선택만 화면이 한다 — 자세한 이유는 {@code EventCalendar}.
 */
async function getEvents(month: string): Promise<EventListResponse | null> {
  const { first, last } = monthBounds(month);
  try {
    return await apiFetch<EventListResponse>(
      `/api/events?from=${ymd(first)}&to=${ymd(last)}`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  // 형식이 어긋난 값이 오면 이번 달로 돌린다. 그대로 넘기면 날짜 계산이 NaN으로 흐른다.
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : currentMonth();
  const events = await getEvents(month);

  return (
    <>
      <MobilePageHead title="행사 캘린더" sub={monthLabel(month)} />

      <div className="mx-auto max-w-[760px] px-0 pb-10 pt-0 sm:px-4 sm:py-8">
        <div className="hidden items-baseline justify-between gap-3 sm:flex">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">행사 캘린더</h1>
          <p className="text-[13px] text-text-3">음악방송과 공연 일정</p>
        </div>

        <nav
          aria-label="달 이동"
          className="flex items-center justify-between gap-2 border-b border-border px-[14px] py-2.5 sm:mt-5 sm:rounded-r2 sm:border sm:px-3"
        >
          <Link
            href={`/events?month=${shiftMonth(month, -1)}`}
            aria-label="이전 달"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-display text-[15px] font-extrabold tracking-tight text-text-1">
            {monthLabel(month)}
          </span>
          <Link
            href={`/events?month=${shiftMonth(month, 1)}`}
            aria-label="다음 달"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </nav>

        {events === null ? (
          <p className="px-[14px] py-12 text-center text-[12.5px] text-text-3 sm:px-0">
            일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : (
          <EventCalendar month={month} events={events.content} />
        )}
      </div>
    </>
  );
}
