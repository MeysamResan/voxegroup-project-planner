"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn, type UiControlSize } from "./utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarMonthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const calendarDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const triggerDateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function calendarDateFromString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isWithinRange(date: Date, minDate: Date | null, maxDate: Date | null): boolean {
  return (!minDate || date >= minDate) && (!maxDate || date <= maxDate);
}

function clampToRange(date: Date, minDate: Date | null, maxDate: Date | null): Date {
  if (minDate && date < minDate) return minDate;
  if (maxDate && date > maxDate) return maxDate;
  return date;
}

export interface GlassDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  clearable?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  size?: UiControlSize;
}

export function GlassDatePicker({
  ariaLabel,
  className,
  clearable = false,
  disabled = false,
  max,
  min,
  onChange,
  placeholder = "Select date",
  size = "md",
  value,
}: GlassDatePickerProps) {
  const selectedDate = useMemo(() => calendarDateFromString(value), [value]);
  const minDate = useMemo(() => min ? calendarDateFromString(min) : null, [min]);
  const maxDate = useMemo(() => max ? calendarDateFromString(max) : null, [max]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  }, []);
  const initialDate = clampToRange(selectedDate ?? today, minDate, maxDate);
  const [open, setOpen] = useState(false);
  const [calendarStyle, setCalendarStyle] = useState<CSSProperties>({});
  const [viewMonth, setViewMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const positionFrameRef = useRef<number | null>(null);
  const calendarId = useId();
  const selectedKey = selectedDate ? dateKey(selectedDate) : "";
  const todayKey = dateKey(today);
  const todayAllowed = isWithinRange(today, minDate, maxDate);

  const calendarDays = useMemo(() => {
    const firstVisibleDate = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 - viewMonth.getDay(),
      12,
    );
    return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDate, index));
  }, [viewMonth]);

  const focusableKey = useMemo(() => {
    const allowed = calendarDays.filter((date) => isWithinRange(date, minDate, maxDate));
    if (selectedDate && allowed.some((date) => dateKey(date) === selectedKey)) return selectedKey;
    if (todayAllowed && allowed.some((date) => dateKey(date) === todayKey)) return todayKey;
    const inMonth = allowed.find((date) => date.getMonth() === viewMonth.getMonth());
    return dateKey(inMonth ?? allowed[0] ?? viewMonth);
  }, [calendarDays, maxDate, minDate, selectedDate, selectedKey, todayAllowed, todayKey, viewMonth]);

  const positionCalendar = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 8;
    const width = Math.min(340, window.innerWidth - viewportPadding * 2);
    const estimatedHeight = Math.min(390, window.innerHeight - viewportPadding * 2);
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const top = availableBelow >= estimatedHeight
      ? rect.bottom + gap
      : availableAbove >= estimatedHeight
        ? Math.max(viewportPadding, rect.top - estimatedHeight - gap)
        : Math.max(
            viewportPadding,
            Math.min(rect.bottom + gap, window.innerHeight - estimatedHeight - viewportPadding),
          );
    const nextStyle: CSSProperties = {
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding)),
      top,
      width,
      maxHeight: window.innerHeight - viewportPadding * 2,
    };
    setCalendarStyle((currentStyle) => (
      currentStyle.left === nextStyle.left
      && currentStyle.top === nextStyle.top
      && currentStyle.width === nextStyle.width
      && currentStyle.maxHeight === nextStyle.maxHeight
        ? currentStyle
        : nextStyle
    ));
  }, []);

  const cancelPositionFrame = useCallback(() => {
    if (positionFrameRef.current === null) return;
    window.cancelAnimationFrame(positionFrameRef.current);
    positionFrameRef.current = null;
  }, []);

  const scheduleCalendarPosition = useCallback(() => {
    if (positionFrameRef.current !== null) return;
    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      positionCalendar();
    });
  }, [positionCalendar]);

  const closeCalendar = useCallback(() => {
    cancelPositionFrame();
    setOpen(false);
  }, [cancelPositionFrame]);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const startDate = clampToRange(selectedDate ?? today, minDate, maxDate);
    setViewMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12));
    cancelPositionFrame();
    positionCalendar();
    setOpen(true);
  }, [cancelPositionFrame, disabled, maxDate, minDate, positionCalendar, selectedDate, today]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !calendarRef.current?.contains(target)) closeCalendar();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCalendar();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", scheduleCalendarPosition);
    window.addEventListener("scroll", scheduleCalendarPosition, true);
    const focusFrame = window.requestAnimationFrame(() => {
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusableKey}"]:not(:disabled)`)
        ?.focus();
    });
    return () => {
      cancelPositionFrame();
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", scheduleCalendarPosition);
      window.removeEventListener("scroll", scheduleCalendarPosition, true);
    };
  }, [cancelPositionFrame, closeCalendar, focusableKey, open, scheduleCalendarPosition]);

  const chooseDate = (date: Date) => {
    if (!isWithinRange(date, minDate, maxDate)) return;
    onChange(dateKey(date));
    closeCalendar();
    triggerRef.current?.focus();
  };

  const focusCalendarDate = (date: Date) => {
    if (date.getMonth() !== viewMonth.getMonth() || date.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
    window.requestAnimationFrame(() => {
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(date)}"]:not(:disabled)`)
        ?.focus();
    });
  };

  const handleDayKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, date: Date) => {
    let nextDate: Date | null = null;
    if (event.key === "ArrowLeft") nextDate = addDays(date, -1);
    if (event.key === "ArrowRight") nextDate = addDays(date, 1);
    if (event.key === "ArrowUp") nextDate = addDays(date, -7);
    if (event.key === "ArrowDown") nextDate = addDays(date, 7);
    if (event.key === "Home") nextDate = addDays(date, -date.getDay());
    if (event.key === "End") nextDate = addDays(date, 6 - date.getDay());
    if (event.key === "PageUp" || event.key === "PageDown") {
      const monthDelta = event.key === "PageUp" ? -1 : 1;
      const targetMonth = new Date(date.getFullYear(), date.getMonth() + monthDelta, 1, 12);
      const lastDay = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
        12,
      ).getDate();
      nextDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        Math.min(date.getDate(), lastDay),
        12,
      );
    }
    if (!nextDate) return;
    event.preventDefault();
    if (!isWithinRange(nextDate, minDate, maxDate)) return;
    focusCalendarDate(nextDate);
  };

  const calendar = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id={calendarId}
          ref={calendarRef}
          className="glass-date-menu ui-date-picker__menu"
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          style={calendarStyle}
          onBlur={() => window.requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!calendarRef.current?.contains(active) && active !== triggerRef.current) closeCalendar();
          })}
        >
          <div className="glass-calendar-header ui-date-picker__header">
            <button
              type="button"
              className="calendar-nav-button"
              aria-label="Previous month"
              onClick={() => setViewMonth(new Date(
                viewMonth.getFullYear(),
                viewMonth.getMonth() - 1,
                1,
                12,
              ))}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <strong aria-live="polite">{calendarMonthFormat.format(viewMonth)}</strong>
            <button
              type="button"
              className="calendar-nav-button"
              aria-label="Next month"
              onClick={() => setViewMonth(new Date(
                viewMonth.getFullYear(),
                viewMonth.getMonth() + 1,
                1,
                12,
              ))}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="glass-calendar-weekdays" aria-hidden="true">
            {DAY_LABELS.map((day) => <span key={day}>{day.slice(0, 2)}</span>)}
          </div>
          <div className="glass-calendar-grid" aria-label={calendarMonthFormat.format(viewMonth)}>
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const outsideMonth = date.getMonth() !== viewMonth.getMonth();
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const isDisabled = !isWithinRange(date, minDate, maxDate);
              return (
                <button
                  type="button"
                  key={key}
                  data-date={key}
                  className={cn(
                    "glass-calendar-day",
                    outsideMonth && "outside-month",
                    isSelected && "selected",
                    isToday && "today",
                  )}
                  aria-label={calendarDateFormat.format(date)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  disabled={isDisabled}
                  tabIndex={!isDisabled && key === focusableKey ? 0 : -1}
                  onClick={() => chooseDate(date)}
                  onKeyDown={(event) => handleDayKeyDown(event, date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="glass-calendar-footer ui-date-picker__footer">
            <button
              type="button"
              disabled={!todayAllowed}
              onClick={() => chooseDate(today)}
            >
              Today
            </button>
            {clearable && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  closeCalendar();
                  triggerRef.current?.focus();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "glass-select-trigger",
          "glass-date-trigger",
          "ui-date-picker__trigger",
          `ui-control--${size}`,
          className,
        )}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-controls={calendarId}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => open ? closeCalendar() : openCalendar()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openCalendar();
          }
        }}
      >
        <span className={selectedDate ? undefined : "placeholder"}>
          {selectedDate ? triggerDateFormat.format(selectedDate) : placeholder}
        </span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>
      {calendar}
    </>
  );
}
