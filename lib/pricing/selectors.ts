import { TARGET_MARGIN_PERCENTAGES } from "./constants.ts";
import type { Modifier, Person, ProjectPlan, ScenarioCalculation } from "./types.ts";

export type QuoteBreakdownItem = {
  label: string;
  detail: string;
  value: number;
};

export type TargetMarginQuote = {
  margin: number;
  quote: number | null;
};

export type DecisionStatus = {
  tone: "neutral" | "safe" | "unsafe";
  label: "Costs not modeled" | "Estimate incomplete" | "Cost covered" | "Below cost";
};

export type DecisionAnalytics = {
  quoteBeforeFloor: number;
  quoteFloorAdjustment: number;
  grossMarginValue: number | null;
  costCoverage: number | null;
  markupOnCost: number | null;
  serviceRevenuePerHour: number | null;
  laborCostPerHour: number | null;
  effortDeltaHours: number;
  effortDeltaPercent: number | null;
  laborCostShare: number;
  expenseCostShare: number;
  targetMarginQuotes: TargetMarginQuote[];
  status: DecisionStatus;
};

export const selectAssignedPeopleCount = (
  scenario: Pick<ProjectPlan, "phases">,
  people: Array<Pick<Person, "id">>,
): number => {
  const availablePeople = new Set(people.map((person) => person.id));
  return new Set(
    scenario.phases.flatMap((phase) =>
      phase.assignments
        .map((assignment) => assignment.personId)
        .filter((personId) => availablePeople.has(personId)),
    ),
  ).size;
};

export const getAssignedPeopleCount = selectAssignedPeopleCount;

export const selectVisibleWarnings = (
  calculation: ScenarioCalculation,
  planningMode: boolean,
): string[] => planningMode ? calculation.planningWarnings : calculation.warnings;

export const selectVisibleModifiers = (
  scenario: Pick<ProjectPlan, "modifiers">,
  planningMode: boolean,
): Modifier[] => planningMode
  ? scenario.modifiers.filter((modifier) => modifier.target === "effort")
  : scenario.modifiers;

export const selectQuoteBreakdown = (
  scenario: Pick<ProjectPlan, "manualAdjustment" | "adjustmentReason">,
  calculation: ScenarioCalculation,
): QuoteBreakdownItem[] => {
  const quoteBeforeFloor = calculation.baseRevenue
    + calculation.modifierRevenue
    + calculation.billableExpenses
    + scenario.manualAdjustment;
  const quoteFloorAdjustment = calculation.quote - quoteBeforeFloor;

  return [
    {
      label: "Base billable amount",
      detail: "Delivery hours and fixed project fee",
      value: calculation.baseRevenue,
    },
    {
      label: "Price modifiers",
      detail: "Commercial complexity and price adjustments",
      value: calculation.modifierRevenue,
    },
    {
      label: "Client-billable expenses",
      detail: "Pass-through and marked-up project expenses",
      value: calculation.billableExpenses,
    },
    {
      label: "Manual adjustment",
      detail: scenario.adjustmentReason.trim() || "No adjustment reason recorded",
      value: scenario.manualAdjustment,
    },
    ...(Math.abs(quoteFloorAdjustment) > 0.005
      ? [{
          label: "Zero-price floor",
          detail: "Prevents the final quote from becoming negative",
          value: quoteFloorAdjustment,
        }]
      : []),
  ];
};

export const getQuoteBreakdown = selectQuoteBreakdown;

export const selectTargetMarginQuotes = (
  calculation: Pick<ScenarioCalculation, "estimatedCost">,
  margins: readonly number[] = TARGET_MARGIN_PERCENTAGES,
): TargetMarginQuote[] => margins.map((margin) => ({
  margin,
  quote: calculation.estimatedCost > 0 && margin < 100
    ? calculation.estimatedCost / (1 - margin / 100)
    : null,
}));

export const getTargetMarginQuotes = selectTargetMarginQuotes;

export const selectDecisionStatus = (
  calculation: Pick<ScenarioCalculation, "estimatedCost" | "quote" | "grossProfit">,
): DecisionStatus => calculation.estimatedCost <= 0
  ? {
      tone: "neutral",
      label: calculation.quote > 0 ? "Costs not modeled" : "Estimate incomplete",
    }
  : calculation.grossProfit >= 0
    ? { tone: "safe", label: "Cost covered" }
    : { tone: "unsafe", label: "Below cost" };

export const selectDecisionAnalytics = (
  scenario: Pick<ProjectPlan, "manualAdjustment">,
  calculation: ScenarioCalculation,
  targetMargins: readonly number[] = TARGET_MARGIN_PERCENTAGES,
): DecisionAnalytics => {
  const quoteBeforeFloor = calculation.baseRevenue
    + calculation.modifierRevenue
    + calculation.billableExpenses
    + scenario.manualAdjustment;
  const effortDeltaHours = calculation.totalHours - calculation.rawHours;

  return {
    quoteBeforeFloor,
    quoteFloorAdjustment: calculation.quote - quoteBeforeFloor,
    grossMarginValue: calculation.quote > 0 ? calculation.grossMargin : null,
    costCoverage: calculation.estimatedCost > 0
      ? (calculation.quote / calculation.estimatedCost) * 100
      : null,
    markupOnCost: calculation.estimatedCost > 0
      ? (calculation.grossProfit / calculation.estimatedCost) * 100
      : null,
    serviceRevenuePerHour: calculation.totalHours > 0
      ? (calculation.quote - calculation.billableExpenses) / calculation.totalHours
      : null,
    laborCostPerHour: calculation.totalHours > 0
      ? calculation.laborCost / calculation.totalHours
      : null,
    effortDeltaHours,
    effortDeltaPercent: calculation.rawHours > 0
      ? (effortDeltaHours / calculation.rawHours) * 100
      : null,
    laborCostShare: calculation.estimatedCost > 0
      ? (calculation.laborCost / calculation.estimatedCost) * 100
      : 0,
    expenseCostShare: calculation.estimatedCost > 0
      ? (calculation.expenseCost / calculation.estimatedCost) * 100
      : 0,
    targetMarginQuotes: selectTargetMarginQuotes(calculation, targetMargins),
    status: selectDecisionStatus(calculation),
  };
};

export const getDecisionAnalytics = selectDecisionAnalytics;
