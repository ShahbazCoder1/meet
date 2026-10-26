"use client";

import { twCss } from "@/lib/tailwind-classes";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date);

export function DateCalendar() {
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentDate = new Date();
    setToday(currentDate);
    setSelectedDate(currentDate);
    setVisibleMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  const firstWeekday = visibleMonth ? (new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay() + 6) % 7 : 0;
  const daysInMonth = visibleMonth ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate() : 0;
  const monthName = visibleMonth ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth) : "";
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return <div className={twCss("calendar-anchor")} ref={rootRef}>
    <button type="button" className={twCss("date-chip")} aria-expanded={open} aria-haspopup="dialog" onClick={() => { if (today) setOpen((value) => !value); }}><span className={twCss("live-dot")}/>{selectedDate ? formatDate(selectedDate) : "Loading date…"}</button>
    {open && visibleMonth && selectedDate && today && <section className={twCss("calendar-popover")} role="dialog" aria-label="Choose a date"><header className={twCss("calendar-popover-header")}><div><p>YOUR CALENDAR</p><h2>{monthName}</h2></div><div className={twCss("calendar-month-controls")}><button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ChevronLeft size={16}/></button><button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ChevronRight size={16}/></button></div></header><div className={twCss("calendar-weekdays")}>{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className={twCss("calendar-days")}>{Array.from({ length: firstWeekday }, (_, index) => <span className={twCss("calendar-empty")} key={`empty-${index}`}/>)}{Array.from({ length: daysInMonth }, (_, index) => { const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1); const selected = isSameDay(date, selectedDate); return <button type="button" key={date.toISOString()} className={twCss(`calendar-day ${isSameDay(date, today) ? "is-today" : ""} ${selected ? "is-selected !text-[#2e211d]" : ""}`)} aria-label={formatDate(date)} aria-pressed={selected} onClick={() => { setSelectedDate(date); setOpen(false); }}>{index + 1}</button>; })}</div><footer className={twCss("calendar-popover-footer")}><span><i/> {isSameDay(selectedDate, today) ? "Today" : `Selected · ${formatDate(selectedDate)}`}</span><button type="button" onClick={() => { setSelectedDate(today); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); }}>Today</button></footer></section>}
  </div>;
}
