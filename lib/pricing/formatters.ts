import { calendarDateFromString } from "./calendar.ts";
import type { Currency, PersonType } from "./types.ts";

export const calendarMonthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
export const calendarDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
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

export const dateFormat = (value: string): string => {
  const date = calendarDateFromString(value);
  if (!date) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

export const friendlyDate = dateFormat;

export const longDate = dateFormat;

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
