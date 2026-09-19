import { kstHm } from "@/lib/event-dates";
import type { EventResponse, EventType } from "@/lib/types";

const TYPE_LABEL: Record<EventType, string> = {
  MUSIC_SHOW: "음악방송",
  CONCERT: "공연",
  ETC: "행사",
};

/**
 * 행사 줄 목록. 캘린더와 홈 스트립이 같은 줄을 쓴다.
 *
 * <p><b>링크가 아니다.</b> 누르면 갈 곳은 그 행사의 교환 피드인데 아직 없다. 지금 링크를 붙이면
 * 빈 화면으로 보내게 되고, 그건 「눌렀더니 아무것도 없다」는 인상을 먼저 남긴다. 교환글이 생길 때
 * 줄 전체를 링크로 바꾼다.
 *
 * <p>같은 이유로 오른쪽 교환 건수 자리를 비워 뒀다. 집계할 대상이 없는데 「0」을 띄우면
 * 죽은 기능처럼 보인다.
 */
export default function EventList({ events }: { events: EventResponse[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-[12.5px] text-text-3">이 날짜에 등록된 행사가 없어요.</p>;
  }

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id} className="flex items-center gap-2.5 border-b border-border py-[11px] last:border-b-0">
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
        </li>
      ))}
    </ul>
  );
}
