import { dateFromString, dateKey, workDatesAtOffsets } from "./calendar.ts";
import type { Person, ProjectPlan, ScenarioCalculation } from "./types.ts";

const finiteOrZero = (value: number): number => Number.isFinite(value) ? value : 0;
const nonNegative = (value: number): number => Math.max(0, finiteOrZero(value));
const wholeNonNegative = (value: number): number => Math.round(nonNegative(value));

/**
 * Produces an exact memo key from values that can change calculation output.
 * Display-only edits such as names and notes can reuse the previous result.
 */
export const calculationInputKey = (
  scenario: ProjectPlan,
  people: Person[],
): string => JSON.stringify([
  scenario.startDate,
  scenario.defaultHours,
  scenario.baseHourlyPrice,
  scenario.fixedFee,
  scenario.manualAdjustment,
  scenario.workingDays,
  scenario.holidays,
  scenario.phases.map((phase) => [
    phase.id,
    phase.days,
    phase.assignments.map((assignment) => assignment.personId),
  ]),
  scenario.expenses.map((expense) => [
    expense.id,
    expense.amount,
    expense.unit,
    expense.billing,
    expense.markup,
  ]),
  scenario.modifiers.map((modifier) => [
    modifier.kind,
    modifier.target,
    modifier.value,
  ]),
  people.map((person) => [person.id, person.hourlyCost]),
]);

export function calculateScenario(
  scenario: ProjectPlan,
  people: Person[],
): ScenarioCalculation {
  const personMap = new Map(people.map((person) => [person.id, person]));
  const defaultHours = Math.min(24, nonNegative(scenario.defaultHours));
  const baseHourlyPrice = nonNegative(scenario.baseHourlyPrice);
  const fixedFee = nonNegative(scenario.fixedFee);
  const scheduleOffsets = [0];
  let workingOffset = 0;
  const rawPhaseData = scenario.phases.map((phase) => {
    const days = wholeNonNegative(phase.days);
    const assignedPeople = Array.from(new Set(
      phase.assignments.map((assignment) => assignment.personId),
    )).flatMap((personId) => {
      const person = personMap.get(personId);
      return person ? [person] : [];
    });
    const assignedRateTotal = assignedPeople.reduce(
      (sum, person) => sum + nonNegative(person.hourlyCost),
      0,
    );
    const averageRate = assignedPeople.length > 0
      ? assignedRateTotal / assignedPeople.length
      : 0;
    const rawHours = days * defaultHours * assignedPeople.length;
    const rawCost = days * defaultHours * assignedRateTotal;
    const startScheduleIndex = days > 0
      ? scheduleOffsets.push(workingOffset) - 1
      : -1;
    const endScheduleIndex = days > 0
      ? scheduleOffsets.push(workingOffset + days - 1) - 1
      : -1;
    workingOffset += days;
    return {
      days,
      rawHours,
      rawCost,
      averageRate,
      assignedPeopleCount: assignedPeople.length,
      startScheduleIndex,
      endScheduleIndex,
    };
  });

  const totalWorkingDays = workingOffset;
  const projectEndScheduleIndex = totalWorkingDays > 0
    ? scheduleOffsets.push(totalWorkingDays - 1) - 1
    : -1;
  const scheduledDates = totalWorkingDays > 0
    ? workDatesAtOffsets(
        scenario.startDate,
        scheduleOffsets,
        scenario.workingDays,
        scenario.holidays,
      )
    : [];
  const scheduleKeyAt = (index: number): string => {
    const date = index >= 0 ? scheduledDates[index] : null;
    return date ? dateKey(date) : "";
  };

  const rawHours = rawPhaseData.reduce(
    (sum, phase) => sum + phase.rawHours,
    0,
  );
  const rawLaborCost = rawPhaseData.reduce(
    (sum, phase) => sum + phase.rawCost,
    0,
  );
  const effortPercent = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + finiteOrZero(modifier.value), 0);
  const fixedEffortHours = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + finiteOrZero(modifier.value), 0);
  const effortMultiplier = Math.max(0, 1 + effortPercent / 100);
  const totalHours = Math.max(0, rawHours * effortMultiplier + fixedEffortHours);
  const weightedLaborRate = rawHours > 0
    ? rawLaborCost / rawHours
    : totalWorkingDays > 0
      ? rawPhaseData.reduce(
          (sum, phase) => sum + phase.averageRate * phase.days,
          0,
        ) / totalWorkingDays
      : rawPhaseData.length > 0
        ? rawPhaseData.reduce((sum, phase) => sum + phase.averageRate, 0)
          / rawPhaseData.length
        : 0;
  const laborCost = Math.max(
    0,
    rawLaborCost * effortMultiplier + fixedEffortHours * weightedLaborRate,
  );

  const phaseResults = scenario.phases.map((phase, index) => {
    const raw = rawPhaseData[index];
    const share = rawHours > 0
      ? raw.rawHours / rawHours
      : totalWorkingDays > 0
        ? raw.days / totalWorkingDays
        : rawPhaseData.length > 0
          ? 1 / rawPhaseData.length
          : 0;
    const adjustedHours = Math.max(
      0,
      raw.rawHours * effortMultiplier + fixedEffortHours * share,
    );
    const averageRate = raw.rawHours > 0 ? raw.rawCost / raw.rawHours : raw.averageRate;
    return {
      id: phase.id,
      rawHours: raw.rawHours,
      adjustedHours,
      laborCost: Math.max(
        0,
        raw.rawCost * effortMultiplier + fixedEffortHours * share * averageRate,
      ),
      revenue: adjustedHours * baseHourlyPrice,
      start: scheduleKeyAt(raw.startScheduleIndex),
      end: scheduleKeyAt(raw.endScheduleIndex),
    };
  });

  const projectStart = totalWorkingDays > 0 ? scheduleKeyAt(0) : "";
  const projectEnd = totalWorkingDays > 0 ? scheduleKeyAt(projectEndScheduleIndex) : "";
  const calendarDays = totalWorkingDays && projectStart && projectEnd
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
    const cost = nonNegative(expense.amount) * multiplier;
    const markup = nonNegative(expense.markup);
    const billable =
      expense.billing === "internal"
        ? 0
        : expense.billing === "markup"
          ? cost * (1 + markup / 100)
          : cost;
    return { id: expense.id, cost, billable };
  });

  const expenseCost = expenseResults.reduce((sum, expense) => sum + expense.cost, 0);
  const billableExpenses = expenseResults.reduce((sum, expense) => sum + expense.billable, 0);
  const baseRevenue = fixedFee + totalHours * baseHourlyPrice;
  const pricePercent = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + finiteOrZero(modifier.value), 0);
  const fixedPriceModifiers = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + finiteOrZero(modifier.value), 0);
  const modifierRevenue = baseRevenue * (pricePercent / 100) + fixedPriceModifiers;
  const manualAdjustment = finiteOrZero(scenario.manualAdjustment);
  const quote = Math.max(
    0,
    baseRevenue + modifierRevenue + billableExpenses + manualAdjustment,
  );
  const estimatedCost = laborCost + expenseCost;
  const grossProfit = quote - estimatedCost;
  const grossMargin = quote > 0 ? (grossProfit / quote) * 100 : 0;

  const planningWarnings: string[] = [];
  const pricingWarnings: string[] = [];
  const hasWorkingDay = scenario.workingDays.some(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  );
  if (!hasWorkingDay) planningWarnings.push("Select at least one working weekday.");
  if (!scenario.phases.length) planningWarnings.push("Add at least one delivery phase.");
  if (scenario.phases.some((phase) => wholeNonNegative(phase.days) === 0)) {
    planningWarnings.push("One or more phases have no workdays.");
  }
  if (rawPhaseData.some((phase) => phase.assignedPeopleCount === 0)) {
    planningWarnings.push("One or more phases have no people assigned.");
  }
  if (totalWorkingDays > 0 && hasWorkingDay && (!projectStart || !projectEnd)) {
    planningWarnings.push("The delivery calendar could not be resolved.");
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
