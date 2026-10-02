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
 * <p>행사 있는 날은 날짜 밑 짧은 선 하나다. 개수를 세는 자리가 아니라 「뭔가 있다」를 알리는 자리다.
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
  //
  // 판정을 목록이 아니라 달로 한다(#696). 조회가 격자 범위로 넓어진 뒤에는 오늘이 앞뒤 칸으로
  // 들어올 수 있어, 목록에서 오늘을 찾는 방식이면 9월을 열었는데 10월 1일이 펴진다.
  const initial = todayKey.startsWith(month) ? todayKey : ymd(first);
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
      <div className="px-gutter pt-3 sm:px-0">
        <div className="mb-2 grid grid-cols-7">
          {DOW.map((d, i) => (
            <span
              key={d}
              className={`text-center text-caption font-bold ${
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
                className={`rounded-control py-2 ${FOCUS_RING} ${on ? "bg-primary text-white" : ""}`}
              >
                <span
                  className={`block font-display text-body ${
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
                {/* 행사가 있는 날은 날짜 밑 짧은 선 하나로 표시한다. 건수 도트(최대 3개)는 걷었다(#758).
                    몇 건인지는 aria-label과 날짜를 누른 뒤 목록이 말한다. */}
                <span className="mt-1 flex h-1 items-end justify-center" aria-hidden="true">
                  {count > 0 && <i className={`h-[2px] w-3 ${on ? "bg-white/85" : "bg-text-3"}`} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div aria-hidden="true" className="mt-section-ruled h-2 bg-surface-2 sm:hidden" />
      <div className="hidden sm:mt-6 sm:block sm:border-t sm:border-border" />

      <div className="px-gutter pt-section-ruled sm:px-0">
        <h2 className="text-body-l font-extrabold text-text-1">
          {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 {weekdayKo(selected)}요일
        </h2>
        <div className="pt-1">
          <EventList events={selectedEvents} />
        </div>
      </div>
    </>
  );
}
