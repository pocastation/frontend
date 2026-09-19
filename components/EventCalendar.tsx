"use client";

import { useState } from "react";
import EventList from "@/components/EventList";
import { calendarDays, monthBounds, todayInKst, weekdayKo, ymd } from "@/lib/event-dates";
import { FOCUS_RING } from "@/lib/ui";
import type { EventResponse } from "@/lib/types";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 월 격자와 선택한 날의 목록.
 *
 * <p>한 달치를 서버에서 한 번에 받아 두고 날짜 선택만 화면에서 한다. 날짜를 누를 때마다 서버에
 * 다시 물으면 달력을 훑는 동작이 매번 왕복이 된다 — 한 달이 수십 건이라 미리 받아도 부담이 없다.
 *
 * <p>도트는 <b>최대 3개</b>에서 멈춘다. 개수를 세는 자리가 아니라 「뭔가 있다」를 알리는 자리다.
 */
export default function EventCalendar({
  month,
  events,
}: {
  month: string;
  events: EventResponse[];
}) {
  const { first } = monthBounds(month);
  const todayKey = ymd(todayInKst());

  // 이번 달이면 오늘을, 아니면 1일을 편다. 다른 달을 열었는데 오늘이 선택돼 있으면
  // 격자와 아래 목록이 서로 다른 달을 말하게 된다.
  const initial = events.find((e) => e.eventDate === todayKey)?.eventDate
    ?? (todayKey.startsWith(month) ? todayKey : ymd(first));
  const [selected, setSelected] = useState(initial);

  const byDate = new Map<string, EventResponse[]>();
  for (const event of events) {
    const bucket = byDate.get(event.eventDate);
    if (bucket) bucket.push(event);
    else byDate.set(event.eventDate, [event]);
  }

  const days = calendarDays(month);
  const selectedEvents = byDate.get(selected) ?? [];

  return (
    <>
      <div className="px-[14px] pt-3 sm:px-0">
        <div className="mb-1.5 grid grid-cols-7">
          {DOW.map((d, i) => (
            <span
              key={d}
              className={`text-center text-[10.5px] font-bold ${
                i === 0 ? "text-accent" : "text-text-3"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const key = ymd(day);
            const outside = !key.startsWith(month);
            const count = byDate.get(key)?.length ?? 0;
            const on = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-pressed={on}
                aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일${count > 0 ? ` 행사 ${count}건` : ""}`}
                className={`rounded-r1 py-1.5 ${FOCUS_RING} ${on ? "bg-primary text-white" : ""}`}
              >
                <span
                  className={`block font-display text-[13.5px] ${
                    on
                      ? "font-bold"
                      : key === todayKey
                        ? "font-extrabold text-primary"
                        : outside
                          ? "font-semibold text-text-3/50"
                          : "font-semibold text-text-1"
                  }`}
                >
                  {day.getDate()}
                </span>
                <span className="mt-[3px] flex h-1 justify-center gap-[2px]" aria-hidden="true">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <i
                      key={i}
                      className={`h-[3px] w-[3px] rounded-full ${on ? "bg-white/85" : "bg-border-2"}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div aria-hidden="true" className="mt-4 h-2 bg-surface-2 sm:hidden" />
      <div className="hidden sm:mt-6 sm:block sm:border-t sm:border-border" />

      <div className="px-[14px] pt-3.5 sm:px-0">
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-text-1">
          {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 {weekdayKo(selected)}요일
        </h2>
        <div className="pt-1">
          <EventList events={selectedEvents} />
        </div>
      </div>
    </>
  );
}
