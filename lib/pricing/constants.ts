import type {
  Currency,
  ExpenseBilling,
  ExpenseUnit,
  ModifierKind,
  ModifierTarget,
  PersonType,
} from "./types.ts";

export const APP_ID = "voxegroup-project-planner" as const;
export const LEGACY_APP_IDS = ["voxe-pricing-studio"] as const;
export const SCHEMA_VERSION = 11 as const;
export const STORAGE_KEY = "voxegroup-project-planner-v1";
export const PLANNING_MODE_KEY = "voxegroup-project-planner-planning-mode-v1";
export const LEGACY_STORAGE_KEYS = [
  "voxe-pricing-studio-v1",
  "voxe-pricing-planning-mode-v1",
] as const;

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
  "#b43853",
  "#3d741f",
  "#4f55ae",
  "#04758c",
  "#ad4934",
  "#267052",
  "#75418f",
  "#8c570d",
  "#2e5eb7",
  "#a9346a",
  "#5f7010",
  "#007782",
  "#974333",
  "#4b657d",
] as const;

export const PERSON_COLOR_NAMES = [
  "Violet",
  "Pink",
  "Teal",
  "Orange",
  "Blue",
  "Gold",
  "Red",
  "Green",
  "Indigo",
  "Cyan",
  "Coral",
  "Forest",
  "Plum",
  "Amber",
  "Azure",
  "Rose",
  "Olive",
  "Turquoise",
  "Brick",
  "Slate",
] as const;

export const PHASE_TONES = [
  { light: "#6741c6", dark: "#aa8cff" },
  { light: "#067b70", dark: "#55d6c1" },
  { light: "#a84d16", dark: "#f3a064" },
  { light: "#266db2", dark: "#73b4f3" },
  { light: "#b43853", dark: "#f67b8e" },
  { light: "#80670b", dark: "#e6c75c" },
  { light: "#96358f", dark: "#e182dc" },
  { light: "#3d741f", dark: "#92d36e" },
  { light: "#4f55ae", dark: "#99a0f5" },
  { light: "#04758c", dark: "#65c9df" },
  { light: "#ad4934", dark: "#f28b74" },
  { light: "#267052", dark: "#70caa1" },
  { light: "#75418f", dark: "#c491dc" },
  { light: "#8c570d", dark: "#e7ad59" },
  { light: "#2e5eb7", dark: "#83aaff" },
  { light: "#a9346a", dark: "#f080b0" },
  { light: "#5f7010", dark: "#bbcf68" },
  { light: "#007782", dark: "#5bd3d9" },
  { light: "#974333", dark: "#e68270" },
  { light: "#4b657d", dark: "#96b8d4" },
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
