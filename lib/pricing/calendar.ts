import { DEFAULT_START_DATE } from "./constants.ts";

const MAX_SCHEDULE_SEARCH_DAYS = 1_000_000;

const parseCalendarDate = (value: string): Date | null => {
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

export const dateFromString = (value: string): Date => {
  return parseCalendarDate(value)
    ?? parseCalendarDate(DEFAULT_START_DATE)
    ?? new Date(2026, 0, 1, 12);
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

const isWeekdayIndex = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= 6;

/**
 * Toggles a weekday while keeping the selection ordered, unique, and usable.
 * An interactive project calendar always retains at least one working day.
 */
export const toggleWorkingDaySelection = (
  workingDays: readonly number[],
  day: number,
): number[] => {
  const normalized = Array.from(new Set(workingDays.filter(isWeekdayIndex)))
    .sort((left, right) => left - right);

  if (!isWeekdayIndex(day)) return normalized;
  if (!normalized.includes(day)) {
    return [...normalized, day].sort((left, right) => left - right);
  }
  if (normalized.length === 1) return normalized;
  return normalized.filter((item) => item !== day);
};

/**
 * Resolves several working-day offsets with one forward-only calendar walk.
 * Already ordered requests stay linear; out-of-order requests are sorted once.
 * Results retain the same order and Date isolation as separate lookups.
 */
export const workDatesAtOffsets = (
  startValue: string,
  offsets: readonly number[],
  workingDays: readonly number[],
  holidays: readonly string[],
): Array<Date | null> => {
  const results = Array<Date | null>(offsets.length).fill(null);
  const normalizedDays = workingDays.filter(isWeekdayIndex);
  if (!normalizedDays.length || !offsets.length) return results;

  const requests: Array<{ offset: number; resultIndex: number }> = [];
  let requestsAreOrdered = true;
  let previousOffset = Number.NEGATIVE_INFINITY;
  offsets.forEach((offset, index) => {
    if (!Number.isFinite(offset)) return;
    const normalizedOffset = Math.max(0, Math.floor(offset));
    if (normalizedOffset < previousOffset) requestsAreOrdered = false;
    previousOffset = normalizedOffset;
    requests.push({ offset: normalizedOffset, resultIndex: index });
  });
  if (!requests.length) return results;
  if (!requestsAreOrdered) {
    requests.sort((left, right) =>
      left.offset - right.offset || left.resultIndex - right.resultIndex
    );
  }

  const activeDays = new Set(normalizedDays);
  const holidaySet = new Set(holidays);
  let current = dateFromString(startValue);
  let guard = 0;
  let currentOffset = 0;
  const largestOffset = requests[requests.length - 1].offset;
  const requestedSearchDays = (largestOffset + holidaySet.size + 2) * 7;
  const searchLimit = Math.min(
    MAX_SCHEDULE_SEARCH_DAYS,
    Number.isSafeInteger(requestedSearchDays) ? requestedSearchDays : MAX_SCHEDULE_SEARCH_DAYS,
  );
  const isWorking = (date: Date) => activeDays.has(date.getDay()) && !holidaySet.has(dateKey(date));

  while (!isWorking(current) && guard < searchLimit) {
    current = addDays(current, 1);
    guard += 1;
  }
  if (!isWorking(current)) return results;

  for (const request of requests) {
    while (currentOffset < request.offset && guard < searchLimit) {
      current = addDays(current, 1);
      if (isWorking(current)) currentOffset += 1;
      guard += 1;
    }
    if (currentOffset !== request.offset) break;
    results[request.resultIndex] = new Date(current);
  }

  return results;
};

export const workDateAtOffset = (
  startValue: string,
  offset: number,
  workingDays: readonly number[],
  holidays: readonly string[],
): Date | null => {
  return workDatesAtOffsets(startValue, [offset], workingDays, holidays)[0] ?? null;
};

export const calendarDateFromString = parseCalendarDate;
