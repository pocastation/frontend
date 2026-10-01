import { kstHm } from "@/lib/event-dates";
import { FOCUS_RING, LABEL_NEUTRAL } from "@/lib/ui";
import type { EventResponse, EventType } from "@/lib/types";
import NavLink from "@/components/NavLink";

const TYPE_LABEL: Record<EventType, string> = {
  MUSIC_SHOW: "음악방송",
  CONCERT: "공연",
  ETC: "행사",
};

// 종류는 색이 아니라 글자로 구분한다(#767) — 셋 모두 중립 라벨이다. 예전(#726)에는 테두리·글자
// 색으로 갈랐는데, 음악방송 파랑이 서비스 어디에도 없는 색이라 이 칩만 다른 서비스처럼 보였다.

/**
 * 행사 줄 목록. 캘린더와 홈 스트립이 같은 줄을 쓴다.
 *
 * <p>줄 전체가 그 행사의 교환 피드로 가는 링크다(#662). 교환글이 생기기 전에는 링크가 아니었다 —
 * 갈 곳이 없는데 누르게 두면 「눌렀더니 아무것도 없다」는 인상을 먼저 남긴다.
 *
 * <p>오른쪽 교환 건수 자리는 아직 비워 둔다. 목록 조회에 건수를 함께 세려면 행사마다 집계가
 * 필요한데, 그 비용을 치를 만큼 지금 글이 많지 않다.
 *
 * <p><b>{@code reserveRows}</b>는 날짜를 옮겨도 아래가 움직이지 않게 미리 잡아 둘 줄 수다(#736).
 * 줄 높이를 상수로 박지 않고 <b>같은 마크업을 숨겨서</b> 채운다 — 글꼴이 바뀌거나 칩 크기를
 * 건드리면 상수는 조용히 틀어지는데, 이 방법은 실제 줄과 언제나 같은 높이가 된다.
 */
export default function EventList({
  events,
  reserveRows = 0,
}: {
  events: EventResponse[];
  reserveRows?: number;
}) {
  const fillers = Math.max(0, reserveRows - events.length);

  if (events.length === 0) {
    // 빈 안내는 확보한 칸 안에서 가운데로 선다. 잡아 둔 칸이 없으면 예전처럼 제 높이를 쓴다.
    if (fillers === 0) {
      return <p className="py-8 text-center text-body-s text-text-3">이 날짜에 등록된 행사가 없어요.</p>;
    }
    return (
      <div className="relative">
        <ul aria-hidden="true" className="invisible">
          {Array.from({ length: fillers }).map((_, i) => (
            <FillerRow key={i} />
          ))}
        </ul>
        <p className="absolute inset-0 flex items-center justify-center text-body-s text-text-3">
          이 날짜에 등록된 행사가 없어요.
        </p>
      </div>
    );
  }

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id} className="border-b border-border last:border-b-0">
          <NavLink nav="forward" href={`/events/${event.id}`} className={`flex items-center gap-2.5 py-[11px] ${FOCUS_RING}`}>
            <span
              className={LABEL_NEUTRAL}
            >
              {TYPE_LABEL[event.type]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-bold text-text-1">
                {event.name}
              </span>
              <span className="mt-px block truncate text-caption text-text-3">
                {event.venue} · {kstHm(event.startsAt)}
              </span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-text-3">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NavLink>
        </li>
      ))}
      {Array.from({ length: fillers }).map((_, i) => (
        <FillerRow key={`filler-${i}`} aria-hidden />
      ))}
    </ul>
  );
}

/** 자리만 차지하는 줄. 실제 줄과 같은 골격이라 높이가 저절로 맞는다. */
function FillerRow({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean } = {}) {
  return (
    <li aria-hidden={ariaHidden} className={ariaHidden ? "invisible" : undefined}>
      <span className="flex items-center gap-2.5 py-[11px]">
        <span className={LABEL_NEUTRAL}>행사</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-bold">&nbsp;</span>
          <span className="mt-px block truncate text-caption">&nbsp;</span>
        </span>
      </span>
    </li>
  );
}
