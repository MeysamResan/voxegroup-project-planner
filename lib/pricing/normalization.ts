import {
  APP_ID,
  COLORS,
  CURRENCIES,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_START_DATE,
  EXPENSE_BILLINGS,
  EXPENSE_UNITS,
  LEGACY_APP_IDS,
  MODIFIER_KINDS,
  MODIFIER_TARGETS,
  PERSON_TYPES,
  SCHEMA_VERSION,
} from "./constants.ts";
import { calendarDateFromString } from "./calendar.ts";
import type {
  Assignment,
  Currency,
  Expense,
  ExpenseBilling,
  ExpenseUnit,
  Modifier,
  ModifierKind,
  ModifierTarget,
  Person,
  PersonType,
  Phase,
  ProjectPlan,
  Workspace,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;
type ProjectPlanRecord = UnknownRecord & {
  projectName: string;
  startDate: string;
  currency: string;
  workingDays: unknown[];
  holidays: unknown[];
  phases: unknown[];
  expenses: unknown[];
  modifiers: unknown[];
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOr = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const enumOr = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback);

const normalizeCurrency = (value: unknown): Currency =>
  value === "GBP" ? "RUB" : enumOr<Currency>(value, CURRENCIES, "USD");

const safeColor = (value: unknown, fallback: string): string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const uniqueId = (
  value: unknown,
  prefix: string,
  index: number,
  usedIds: Set<string>,
): string => {
  const requested = typeof value === "string" && value.trim() ? value : `${prefix}-${index + 1}`;
  let candidate = requested;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${requested}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
};

const normalizePeople = (value: unknown[]): Person[] => {
  const usedIds = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    return [{
      id: uniqueId(item.id, "person", index, usedIds),
      name: stringOr(item.name, "Unnamed person"),
      type: enumOr<PersonType>(item.type, PERSON_TYPES, "Employee"),
      role: stringOr(item.role, "Team member"),
      department: stringOr(item.department, "Delivery"),
      email: stringOr(item.email),
      phone: stringOr(item.phone),
      location: stringOr(item.location, "Baghdad, Iraq"),
      skills: stringOr(item.skills),
      notes: stringOr(item.notes),
      hourlyCost: finiteOr(item.hourlyCost, 0),
      color: safeColor(item.color, COLORS[index % COLORS.length]),
    }];
  });
};

const normalizeAssignments = (
  value: unknown,
  validPersonIds?: ReadonlySet<string>,
): Assignment[] => {
  if (!Array.isArray(value)) return [];
  const usedPersonIds = new Set<string>();
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.personId !== "string" || !item.personId) return [];
    if (usedPersonIds.has(item.personId)) return [];
    if (validPersonIds && !validPersonIds.has(item.personId)) return [];
    usedPersonIds.add(item.personId);
    return [{ personId: item.personId }];
  });
};

const normalizePhases = (
  value: unknown[],
  validPersonIds?: ReadonlySet<string>,
): Phase[] => {
  const usedIds = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    return [{
      id: uniqueId(item.id, "phase", index, usedIds),
      name: stringOr(item.name, "Untitled phase"),
      days: finiteOr(item.days, 0),
      // Legacy schedule and per-assignment hours are intentionally discarded.
      assignments: normalizeAssignments(item.assignments, validPersonIds),
    }];
  });
};

const normalizeExpenses = (value: unknown[]): Expense[] => {
  const usedIds = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    return [{
      id: uniqueId(item.id, "expense", index, usedIds),
      name: stringOr(item.name, "Untitled expense"),
      notes: stringOr(item.notes),
      amount: finiteOr(item.amount, 0),
      unit: enumOr<ExpenseUnit>(item.unit, EXPENSE_UNITS, "fixed"),
      billing: enumOr<ExpenseBilling>(item.billing, EXPENSE_BILLINGS, "internal"),
      markup: finiteOr(item.markup, 0),
    }];
  });
};

const normalizeModifiers = (value: unknown[]): Modifier[] => {
  const usedIds = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    return [{
      id: uniqueId(item.id, "modifier", index, usedIds),
      name: stringOr(item.name, "Untitled modifier"),
      notes: stringOr(item.notes),
      kind: enumOr<ModifierKind>(item.kind, MODIFIER_KINDS, "fixed"),
      target: enumOr<ModifierTarget>(item.target, MODIFIER_TARGETS, "price"),
      value: finiteOr(item.value, 0),
    }];
  });
};

export const isProjectPlan = (value: unknown): value is ProjectPlanRecord => {
  if (!isRecord(value)) return false;
  return (
    typeof value.projectName === "string" &&
    typeof value.startDate === "string" &&
    typeof value.currency === "string" &&
    Array.isArray(value.workingDays) &&
    Array.isArray(value.holidays) &&
    Array.isArray(value.phases) &&
    Array.isArray(value.expenses) &&
    Array.isArray(value.modifiers)
  );
};

/**
 * Migrates any supported legacy project shape to schema v7 and removes unknown
 * fields. Pass the normalized people IDs to also remove orphan assignments.
 */
export const normalizeProjectPlan = (
  value: unknown,
  validPersonIds?: ReadonlySet<string>,
): ProjectPlan | null => {
  if (!isProjectPlan(value)) return null;

  const legacyBaseHourlyPrice = typeof value.baseHourlyPrice === "number"
    ? value.baseHourlyPrice
    : value.clientRate;

  const workingDays = Array.from(new Set(
    value.workingDays.filter(
      (day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6,
    ),
  ));
  const holidays = Array.from(new Set(
    value.holidays.filter(
      (holiday): holiday is string =>
        typeof holiday === "string" && calendarDateFromString(holiday) !== null,
    ),
  ));

  return {
    projectName: value.projectName,
    currency: normalizeCurrency(value.currency),
    startDate: calendarDateFromString(value.startDate) ? value.startDate : DEFAULT_START_DATE,
    baseHourlyPrice: finiteOr(legacyBaseHourlyPrice, 0),
    baseHourlyPriceNotes: stringOr(value.baseHourlyPriceNotes),
    fixedFee: finiteOr(value.fixedFee, 0),
    fixedFeeNotes: stringOr(value.fixedFeeNotes),
    defaultHours: finiteOr(value.defaultHours, DEFAULT_HOURS_PER_DAY),
    workingDays,
    holidays,
    phases: normalizePhases(value.phases, validPersonIds),
    expenses: normalizeExpenses(value.expenses),
    modifiers: normalizeModifiers(value.modifiers),
    manualAdjustment: finiteOr(value.manualAdjustment, 0),
    adjustmentReason: stringOr(value.adjustmentReason),
  };
};

const isFutureSchema = (value: unknown): boolean => {
  if (typeof value === "number") return !Number.isFinite(value) || value > SCHEMA_VERSION;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > SCHEMA_VERSION;
  }
  return false;
};

const isSupportedAppId = (value: unknown): boolean =>
  value === APP_ID || LEGACY_APP_IDS.some((legacyId) => value === legacyId);

export const normalizeWorkspace = (value: unknown): Workspace | null => {
  if (!isRecord(value)) return null;
  if (
    !isSupportedAppId(value.app) ||
    !Array.isArray(value.people) ||
    isFutureSchema(value.schemaVersion)
  ) {
    return null;
  }

  const people = normalizePeople(value.people);
  const validPersonIds = new Set(people.map((person) => person.id));

  let projectCandidate = value.project;
  if (!isProjectPlan(projectCandidate)) {
    if (!Array.isArray(value.scenarios) || !value.scenarios.length) return null;
    projectCandidate = value.scenarios.find(
      (item) => isRecord(item) && item.id === value.activeScenarioId,
    ) ?? value.scenarios[0];
  }

  const project = normalizeProjectPlan(projectCandidate, validPersonIds);
  if (!project) return null;

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    people,
    project,
  };
};
