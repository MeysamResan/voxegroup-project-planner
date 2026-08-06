import { dateFromString } from "./calendar.ts";
import type { Currency, PersonType } from "./types.ts";

const friendlyDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const calendarMonthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
export const calendarDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: Currency, compact: boolean): Intl.NumberFormat => {
  const key = `${currency}:${compact ? "compact" : "standard"}`;
  const cached = currencyFormatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
  });
  currencyFormatterCache.set(key, formatter);
  return formatter;
};

export const currencyFormat = (currency: Currency, value: number, compact = false): string => {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const useCompactNotation = compact && Math.abs(normalizedValue) >= 100000;
  return getCurrencyFormatter(currency, useCompactNotation).format(normalizedValue);
};

export const formatCurrency = currencyFormat;

export const friendlyDate = (value: string): string =>
  value ? friendlyDateFormatter.format(dateFromString(value)) : "—";

export const longDate = (value: string): string =>
  value ? longDateFormatter.format(dateFromString(value)) : "—";

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export const personTypeClass = (type: PersonType): string =>
  type.toLowerCase().replace(" ", "-");

export const safeFilename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "voxe-project";
