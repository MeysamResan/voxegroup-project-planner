import type {
  Currency,
  ExpenseBilling,
  ExpenseUnit,
  ModifierKind,
  ModifierTarget,
  PersonType,
} from "./types.ts";

export const APP_ID = "voxe-pricing-studio" as const;
export const SCHEMA_VERSION = 7 as const;
export const STORAGE_KEY = "voxe-pricing-studio-v1";
export const PLANNING_MODE_KEY = "voxe-pricing-planning-mode-v1";

export const CURRENCIES: readonly Currency[] = ["USD", "IQD", "EUR", "RUB"];
export const PERSON_TYPES: readonly PersonType[] = [
  "Employee",
  "Intern",
  "Contractor",
  "Freelancer",
  "Advisor",
];
export const EXPENSE_UNITS: readonly ExpenseUnit[] = [
  "fixed",
  "person_hour",
  "workday",
  "calendar_day",
  "month",
];
export const EXPENSE_BILLINGS: readonly ExpenseBilling[] = [
  "internal",
  "pass_through",
  "markup",
];
export const MODIFIER_TARGETS: readonly ModifierTarget[] = ["effort", "price"];
export const MODIFIER_KINDS: readonly ModifierKind[] = ["percentage", "fixed"];

export const COLORS = [
  "#7c5cff",
  "#eb6cff",
  "#33c7b7",
  "#ff985c",
  "#5d91ff",
  "#d9b84f",
] as const;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4] as const;
export const DEFAULT_START_DATE = "2026-08-09";
export const DEFAULT_HOURS_PER_DAY = 6;
export const TARGET_MARGIN_PERCENTAGES = [20, 30, 40] as const;

export const UNIT_LABELS: Record<ExpenseUnit, string> = {
  fixed: "Fixed once",
  person_hour: "Per person-hour",
  workday: "Per workday",
  calendar_day: "Per calendar day",
  month: "Per month",
};

export const BILLING_LABELS: Record<ExpenseBilling, string> = {
  internal: "Internal only",
  pass_through: "Pass at cost",
  markup: "Pass + markup",
};

// Backward-compatible names used by the existing UI.
export const unitLabels = UNIT_LABELS;
export const billingLabels = BILLING_LABELS;
