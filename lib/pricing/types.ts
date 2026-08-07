export type Currency = "USD" | "IQD" | "EUR" | "RUB";

export type PersonType =
  | "Employee"
  | "Intern"
  | "Contractor"
  | "Freelancer"
  | "Advisor";

export type ExpenseUnit =
  | "fixed"
  | "person_hour"
  | "workday"
  | "calendar_day"
  | "month";

export type ExpenseBilling = "internal" | "pass_through" | "markup";
export type ModifierTarget = "effort" | "price";
export type ModifierKind = "percentage" | "fixed";
export type ViewMode = "internal" | "client";
export type ProjectSettingsPanel = "commercial" | "schedule" | "modifiers" | "expenses";
export type DeliveryPanel = "people" | "phases";

export type Person = {
  id: string;
  name: string;
  type: PersonType;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  skills: string;
  notes: string;
  hourlyCost: number;
  color: string;
};

export type Assignment = {
  personId: string;
};

export type Phase = {
  id: string;
  name: string;
  days: number;
  assignments: Assignment[];
};

export type Expense = {
  id: string;
  name: string;
  notes: string;
  amount: number;
  unit: ExpenseUnit;
  billing: ExpenseBilling;
  markup: number;
};

export type Modifier = {
  id: string;
  name: string;
  notes: string;
  kind: ModifierKind;
  target: ModifierTarget;
  value: number;
};

export type ProjectPlan = {
  projectName: string;
  currency: Currency;
  startDate: string;
  baseHourlyPrice: number;
  baseHourlyPriceNotes: string;
  fixedFee: number;
  fixedFeeNotes: string;
  defaultHours: number;
  workingDays: number[];
  holidays: string[];
  phases: Phase[];
  expenses: Expense[];
  modifiers: Modifier[];
  manualAdjustment: number;
  adjustmentReason: string;
};

export type Workspace = {
  app: "voxegroup-project-planner";
  schemaVersion: 7;
  people: Person[];
  project: ProjectPlan;
};

export type PhaseResult = {
  id: string;
  rawHours: number;
  adjustedHours: number;
  laborCost: number;
  revenue: number;
  start: string;
  end: string;
};

export type ExpenseResult = {
  id: string;
  cost: number;
  billable: number;
};

/** Complete, deterministic output of a project pricing calculation. */
export type ScenarioCalculation = {
  rawHours: number;
  totalHours: number;
  laborCost: number;
  expenseCost: number;
  estimatedCost: number;
  billableExpenses: number;
  baseRevenue: number;
  modifierRevenue: number;
  quote: number;
  grossProfit: number;
  grossMargin: number;
  totalWorkingDays: number;
  calendarDays: number;
  projectStart: string;
  projectEnd: string;
  phaseResults: PhaseResult[];
  expenseResults: ExpenseResult[];
  planningWarnings: string[];
  pricingWarnings: string[];
  warnings: string[];
};
