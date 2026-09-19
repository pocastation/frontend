import Link from "next/link";
import { kstHm } from "@/lib/event-dates";
import { FOCUS_RING } from "@/lib/ui";
import type { EventResponse, EventType } from "@/lib/types";

const TYPE_LABEL: Record<EventType, string> = {
  MUSIC_SHOW: "음악방송",
  CONCERT: "공연",
  ETC: "행사",
};

/**
 * 행사 줄 목록. 캘린더와 홈 스트립이 같은 줄을 쓴다.
 *
 * <p>줄 전체가 그 행사의 교환 피드로 가는 링크다(#662). 교환글이 생기기 전에는 링크가 아니었다 —
 * 갈 곳이 없는데 누르게 두면 「눌렀더니 아무것도 없다」는 인상을 먼저 남긴다.
 *
 * <p>오른쪽 교환 건수 자리는 아직 비워 둔다. 목록 조회에 건수를 함께 세려면 행사마다 집계가
 * 필요한데, 그 비용을 치를 만큼 지금 글이 많지 않다.
 */
export default function EventList({ events }: { events: EventResponse[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-[12.5px] text-text-3">이 날짜에 등록된 행사가 없어요.</p>;
  }

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id} className="border-b border-border last:border-b-0">
          <Link href={`/events/${event.id}`} className={`flex items-center gap-2.5 py-[11px] ${FOCUS_RING}`}>
            <span className="shrink-0 rounded-r1 border border-border-2 px-1.5 py-0.5 text-[10px] font-extrabold text-text-2">
              {TYPE_LABEL[event.type]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-bold tracking-[-0.01em] text-text-1">
                {event.name}
              </span>
              <span className="mt-px block truncate text-[11px] text-text-3">
                {event.venue} · {kstHm(event.startsAt)}
              </span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-text-3">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
