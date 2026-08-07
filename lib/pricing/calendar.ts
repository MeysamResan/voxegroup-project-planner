import { DEFAULT_START_DATE } from "./constants.ts";

export const dateFromString = (value: string): Date => {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_START_DATE + "T12:00:00") : date;
};

export const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
};

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const workDateAtOffset = (
  startValue: string,
  offset: number,
  workingDays: number[],
  holidays: string[],
): Date | null => {
  if (!workingDays.length) return null;

  const activeDays = new Set(workingDays);
  const holidaySet = new Set(holidays);
  let current = dateFromString(startValue);
  let guard = 0;
  const isWorking = (date: Date) => activeDays.has(date.getDay()) && !holidaySet.has(dateKey(date));

  while (!isWorking(current) && guard < 370) {
    current = addDays(current, 1);
    guard += 1;
  }

  let remaining = Math.max(0, Math.floor(offset));
  while (remaining > 0 && guard < 5000) {
    current = addDays(current, 1);
    if (isWorking(current)) remaining -= 1;
    guard += 1;
  }
  return current;
};

export const calendarDateFromString = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
};
