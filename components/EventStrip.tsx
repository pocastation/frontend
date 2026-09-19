"use client";

import { useState } from "react";
import Link from "next/link";
import EventList from "@/components/EventList";
import { addDays, todayInKst, weekdayIndex, ymd } from "@/lib/event-dates";
import { FOCUS_RING } from "@/lib/ui";
import type { EventResponse } from "@/lib/types";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const DAYS = 14;

/**
 * 홈의 행사 스트립(#659). 캘린더로 들어가는 입구다.
 *
 * <p>모바일은 7칸씩 가로로 넘기고 데스크탑은 14칸을 한 줄에 편다. 2주를 모바일 한 화면에
 * 욱여넣으면 칸이 40px 밑으로 내려가 터치 영역이 무너진다 — 넓은 지면에서는 그 제약이 없다.
 *
 * <p>행사가 하나도 없으면 블록을 만들지 않는다. 빈 달력은 「준비 중인 서비스」로 읽힌다.
 */
export default function EventStrip({ events }: { events: EventResponse[] }) {
  const today = todayInKst();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));

  const byDate = new Map<string, EventResponse[]>();
  for (const event of events) {
    const bucket = byDate.get(event.eventDate);
    if (bucket) bucket.push(event);
    else byDate.set(event.eventDate, [event]);
  }

  // 처음 여는 날은 「행사가 있는 가장 가까운 날」이다. 오늘로 고정하면 오늘이 비었을 때
  // 아래가 빈 채로 열려, 일정이 없는 서비스처럼 보인다.
  const firstWithEvent = days.map(ymd).find((key) => byDate.has(key));
  const [selected, setSelected] = useState(firstWithEvent ?? ymd(today));

  if (events.length === 0) return null;

  const selectedEvents = byDate.get(selected) ?? [];

  return (
    <section aria-label="다가오는 행사" className="px-[14px] pt-4 sm:mx-auto sm:max-w-[1160px] sm:px-4 sm:pt-10">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-text-1 sm:font-display sm:text-xl sm:font-extrabold">
          다가오는 행사
        </h2>
        <Link href="/events" className={`flex items-center gap-0.5 text-xs font-semibold text-text-3 ${FOCUS_RING}`}>
          캘린더
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 sm:overflow-visible">
        {days.map((day) => {
          const key = ymd(day);
          const count = byDate.get(key)?.length ?? 0;
          const on = key === selected;
          const dow = weekdayIndex(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={on}
              aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일${count > 0 ? ` 행사 ${count}건` : ""}`}
              className={`w-[42px] shrink-0 rounded-[3px] border py-1.5 sm:w-auto sm:flex-1 ${FOCUS_RING} ${
                on ? "border-primary bg-primary text-white" : "border-border bg-white"
              }`}
            >
              <span
                className={`block text-center text-[10px] font-bold leading-tight ${
                  on ? "text-white/70" : dow === 0 ? "text-accent" : "text-text-3"
                }`}
              >
                {DOW[dow]}
              </span>
              <span className="block text-center font-display text-base font-bold leading-tight">
                {day.getDate()}
              </span>
              <span className="mt-[3px] flex h-1 justify-center gap-[2px]" aria-hidden="true">
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                  <i key={i} className={`h-[3px] w-[3px] rounded-full ${on ? "bg-white/85" : "bg-border-2"}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-1.5">
        <EventList events={selectedEvents} />
      </div>
    </section>
  );
}
