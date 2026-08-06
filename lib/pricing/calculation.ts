import { dateFromString, dateKey, workDateAtOffset } from "./calendar.ts";
import type { Person, ProjectPlan, ScenarioCalculation } from "./types.ts";

export function calculateScenario(
  scenario: ProjectPlan,
  people: Person[],
): ScenarioCalculation {
  const personMap = new Map(people.map((person) => [person.id, person]));
  const defaultHours = Math.max(0, scenario.defaultHours);
  let workingOffset = 0;
  const rawPhaseData = new Map<
    string,
    { rawHours: number; rawCost: number; start: string; end: string }
  >();

  scenario.phases.forEach((phase) => {
    const days = Math.max(0, Math.round(phase.days));
    const rawHours = days * defaultHours * phase.assignments.length;
    const rawCost = phase.assignments.reduce((sum, assignment) => {
      const person = personMap.get(assignment.personId);
      return sum + days * defaultHours * Math.max(0, person?.hourlyCost ?? 0);
    }, 0);
    const start = dateKey(
      workDateAtOffset(scenario.startDate, workingOffset, scenario.workingDays, scenario.holidays),
    );
    const end = dateKey(
      workDateAtOffset(
        scenario.startDate,
        workingOffset + Math.max(0, days - 1),
        scenario.workingDays,
        scenario.holidays,
      ),
    );
    rawPhaseData.set(phase.id, { rawHours, rawCost, start, end });
    workingOffset += days;
  });

  const rawHours = Array.from(rawPhaseData.values()).reduce(
    (sum, phase) => sum + phase.rawHours,
    0,
  );
  const rawLaborCost = Array.from(rawPhaseData.values()).reduce(
    (sum, phase) => sum + phase.rawCost,
    0,
  );
  const effortPercent = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const fixedEffortHours = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const effortMultiplier = Math.max(0, 1 + effortPercent / 100);
  const totalHours = Math.max(0, rawHours * effortMultiplier + fixedEffortHours);
  const weightedLaborRate = rawHours > 0 ? rawLaborCost / rawHours : 0;
  const laborCost = Math.max(
    0,
    rawLaborCost * effortMultiplier + fixedEffortHours * weightedLaborRate,
  );

  const phaseResults = scenario.phases.map((phase) => {
    const raw = rawPhaseData.get(phase.id) ?? {
      rawHours: 0,
      rawCost: 0,
      start: "",
      end: "",
    };
    const share = rawHours > 0 ? raw.rawHours / rawHours : 0;
    const adjustedHours = Math.max(
      0,
      raw.rawHours * effortMultiplier + fixedEffortHours * share,
    );
    const averageRate = raw.rawHours > 0 ? raw.rawCost / raw.rawHours : weightedLaborRate;
    return {
      id: phase.id,
      rawHours: raw.rawHours,
      adjustedHours,
      laborCost: Math.max(
        0,
        raw.rawCost * effortMultiplier + fixedEffortHours * share * averageRate,
      ),
      revenue: adjustedHours * scenario.baseHourlyPrice,
      start: raw.start,
      end: raw.end,
    };
  });

  const totalWorkingDays = workingOffset;
  const projectStart = dateKey(
    workDateAtOffset(scenario.startDate, 0, scenario.workingDays, scenario.holidays),
  );
  const projectEnd = dateKey(
    workDateAtOffset(
      scenario.startDate,
      Math.max(0, totalWorkingDays - 1),
      scenario.workingDays,
      scenario.holidays,
    ),
  );
  const calendarDays = totalWorkingDays
    ? Math.max(
        1,
        Math.round(
          (dateFromString(projectEnd).getTime() - dateFromString(projectStart).getTime()) / 86400000,
        ) + 1,
      )
    : 0;

  const expenseResults = scenario.expenses.map((expense) => {
    let multiplier = 1;
    if (expense.unit === "person_hour") multiplier = totalHours;
    if (expense.unit === "workday") multiplier = totalWorkingDays;
    if (expense.unit === "calendar_day") multiplier = calendarDays;
    if (expense.unit === "month") multiplier = calendarDays / 30.4;
    const cost = Math.max(0, expense.amount * multiplier);
    const billable =
      expense.billing === "internal"
        ? 0
        : expense.billing === "markup"
          ? cost * (1 + expense.markup / 100)
          : cost;
    return { id: expense.id, cost, billable };
  });

  const expenseCost = expenseResults.reduce((sum, expense) => sum + expense.cost, 0);
  const billableExpenses = expenseResults.reduce((sum, expense) => sum + expense.billable, 0);
  const baseRevenue = Math.max(0, scenario.fixedFee + totalHours * scenario.baseHourlyPrice);
  const pricePercent = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const fixedPriceModifiers = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const modifierRevenue = baseRevenue * (pricePercent / 100) + fixedPriceModifiers;
  const quote = Math.max(
    0,
    baseRevenue + modifierRevenue + billableExpenses + scenario.manualAdjustment,
  );
  const estimatedCost = laborCost + expenseCost;
  const grossProfit = quote - estimatedCost;
  const grossMargin = quote > 0 ? (grossProfit / quote) * 100 : 0;

  const planningWarnings: string[] = [];
  const pricingWarnings: string[] = [];
  if (!scenario.workingDays.length) planningWarnings.push("Select at least one working weekday.");
  if (!scenario.phases.length) planningWarnings.push("Add at least one delivery phase.");
  if (scenario.phases.some((phase) => !phase.assignments.length)) {
    planningWarnings.push("One or more phases have no people assigned.");
  }
  if (scenario.defaultHours > 24) {
    planningWarnings.push("Default hours per day exceeds 24 hours.");
  }
  if (grossProfit < 0) pricingWarnings.push("The quote is below estimated project cost.");

  return {
    rawHours,
    totalHours,
    laborCost,
    expenseCost,
    estimatedCost,
    billableExpenses,
    baseRevenue,
    modifierRevenue,
    quote,
    grossProfit,
    grossMargin,
    totalWorkingDays,
    calendarDays,
    projectStart,
    projectEnd,
    phaseResults,
    expenseResults,
    planningWarnings,
    pricingWarnings,
    warnings: [...planningWarnings, ...pricingWarnings],
  };
}
