import assert from "node:assert/strict";
import test from "node:test";

import {
  COLORS,
  DEFAULT_START_DATE,
  calculateScenario,
  initialWorkspace,
  normalizeWorkspace,
  selectAssignedPeopleCount,
  selectDecisionAnalytics,
  selectQuoteBreakdown,
  toggleWorkingDaySelection,
} from "../lib/pricing/index.ts";

const closeTo = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);
};

test("built-in preset is rich, valid, and calculation-ready", () => {
  const workspace = initialWorkspace();
  const result = calculateScenario(workspace.project, workspace.people);
  const freshWorkspace = initialWorkspace();
  const freshResult = calculateScenario(freshWorkspace.project, freshWorkspace.people);

  assert.deepEqual(freshWorkspace, workspace);
  assert.deepEqual(freshResult, result);
  assert.deepEqual(normalizeWorkspace(structuredClone(workspace)), workspace);
  assert.ok(workspace.people.length >= 6);
  assert.ok(workspace.project.phases.length >= 5);
  assert.ok(workspace.project.expenses.length >= 3);
  assert.ok(workspace.project.modifiers.length >= 3);
  assert.ok(workspace.project.holidays.length >= 2);

  const presetNotes = [
    ...workspace.people.map((person) => person.notes),
    workspace.project.baseHourlyPriceNotes,
    workspace.project.fixedFeeNotes,
    ...workspace.project.expenses.map((expense) => expense.notes),
    ...workspace.project.modifiers.map((modifier) => modifier.notes),
  ];
  assert.ok(presetNotes.some((notes) => notes.trim() === ""));
  assert.ok(presetNotes.some((notes) => notes.trim() !== ""));

  for (const records of [
    workspace.people,
    workspace.project.phases,
    workspace.project.expenses,
    workspace.project.modifiers,
  ]) {
    assert.equal(new Set(records.map((record) => record.id)).size, records.length);
  }

  const personIds = new Set(workspace.people.map((person) => person.id));
  for (const phase of workspace.project.phases) {
    const assignmentIds = phase.assignments.map((assignment) => assignment.personId);
    assert.ok(Number.isInteger(phase.days) && phase.days > 0);
    assert.equal(new Set(assignmentIds).size, assignmentIds.length);
    assert.ok(assignmentIds.every((personId) => personIds.has(personId)));
  }

  assert.equal(result.phaseResults.length, workspace.project.phases.length);
  assert.equal(result.expenseResults.length, workspace.project.expenses.length);
  closeTo(result.estimatedCost, result.laborCost + result.expenseCost);
  closeTo(result.grossProfit, result.quote - result.estimatedCost);
  assert.ok(result.totalHours > 0);
  assert.ok(result.quote > 0);
  assert.deepEqual(result.warnings, []);
});

test("working weekdays and holidays update the calculated delivery calendar", () => {
  const workspace = initialWorkspace();
  const baseline = calculateScenario(workspace.project, workspace.people);
  const fourDayWeek = calculateScenario(
    { ...workspace.project, workingDays: [1, 2, 3, 4] },
    workspace.people,
  );
  const withAdditionalHoliday = calculateScenario(
    { ...workspace.project, holidays: [...workspace.project.holidays, "2026-08-10"] },
    workspace.people,
  );

  assert.notEqual(fourDayWeek.projectEnd, baseline.projectEnd);
  assert.ok(fourDayWeek.calendarDays > baseline.calendarDays);
  assert.notEqual(withAdditionalHoliday.projectEnd, baseline.projectEnd);
  assert.ok(withAdditionalHoliday.calendarDays > baseline.calendarDays);
  closeTo(fourDayWeek.totalHours, baseline.totalHours);
  closeTo(withAdditionalHoliday.totalHours, baseline.totalHours);
  assert.ok(fourDayWeek.expenseCost > baseline.expenseCost);
  assert.ok(fourDayWeek.quote > baseline.quote);
  assert.ok(withAdditionalHoliday.expenseCost > baseline.expenseCost);
  assert.ok(withAdditionalHoliday.quote > baseline.quote);
});

test("working weekday toggles stay ordered and always retain a usable calendar", () => {
  assert.deepEqual(toggleWorkingDaySelection([0, 1, 2, 3, 4], 2), [0, 1, 3, 4]);
  assert.deepEqual(toggleWorkingDaySelection([0, 1, 3, 4], 6), [0, 1, 3, 4, 6]);
  assert.deepEqual(toggleWorkingDaySelection([3], 3), [3]);
  assert.deepEqual(toggleWorkingDaySelection([], 5), [5]);
  assert.deepEqual(toggleWorkingDaySelection([4, 4, 9, -1, 2], 8), [2, 4]);
});

test("calendar-based billable expenses follow the calculated schedule span", () => {
  const workspace = initialWorkspace();
  const calendarExpense = {
    id: "expense-calendar-hosting",
    name: "Hosted project room",
    notes: "",
    amount: 10,
    unit: "calendar_day",
    billing: "pass_through",
    markup: 0,
  };
  const project = { ...workspace.project, expenses: [calendarExpense] };
  const baseline = calculateScenario(project, workspace.people);
  const fourDayWeek = calculateScenario(
    { ...project, workingDays: [1, 2, 3, 4] },
    workspace.people,
  );
  const withHoliday = calculateScenario(
    { ...project, holidays: [...workspace.project.holidays, "2026-08-10"] },
    workspace.people,
  );

  assert.equal(baseline.expenseResults[0].cost, baseline.calendarDays * 10);
  assert.equal(baseline.expenseResults[0].billable, baseline.calendarDays * 10);
  assert.ok(fourDayWeek.calendarDays > baseline.calendarDays);
  assert.equal(fourDayWeek.expenseResults[0].cost, fourDayWeek.calendarDays * 10);
  assert.equal(fourDayWeek.expenseResults[0].billable, fourDayWeek.calendarDays * 10);
  closeTo(
    fourDayWeek.expenseCost - baseline.expenseCost,
    (fourDayWeek.calendarDays - baseline.calendarDays) * 10,
  );
  closeTo(
    fourDayWeek.quote - baseline.quote,
    (fourDayWeek.calendarDays - baseline.calendarDays) * 10,
  );
  assert.ok(withHoliday.calendarDays > baseline.calendarDays);
  assert.equal(withHoliday.expenseResults[0].cost, withHoliday.calendarDays * 10);
  assert.equal(withHoliday.expenseResults[0].billable, withHoliday.calendarDays * 10);
});

test("a project with no working weekdays has no calculated schedule", () => {
  const workspace = initialWorkspace();
  const baseline = calculateScenario(workspace.project, workspace.people);
  const result = calculateScenario(
    { ...workspace.project, workingDays: [] },
    workspace.people,
  );

  assert.equal(result.projectStart, "");
  assert.equal(result.projectEnd, "");
  assert.equal(result.calendarDays, 0);
  assert.ok(result.phaseResults.every((phase) => phase.start === "" && phase.end === ""));
  assert.ok(result.planningWarnings.includes("Select at least one working weekday."));
  // Phase durations are entered as workdays, so an invalid calendar does not erase effort.
  assert.equal(result.totalWorkingDays, baseline.totalWorkingDays);
  closeTo(result.totalHours, baseline.totalHours);
});

test("workspace normalization sanitizes imported data and keeps assignments valid", () => {
  const unsafe = structuredClone(initialWorkspace());
  const validPersonId = unsafe.people[0].id;
  unsafe.project.currency = "DOGE";
  unsafe.project.startDate = "not-a-date";
  unsafe.people[0].color = "url(https://example.com/tracker.png)";
  unsafe.people[0].hourlyCost = Number.NaN;
  unsafe.project.phases[0].assignments = [
    { personId: validPersonId },
    { personId: validPersonId },
    { personId: "missing-person" },
  ];

  const normalized = normalizeWorkspace(unsafe);
  assert.ok(normalized);
  assert.equal(normalized.project.currency, "USD");
  assert.equal(normalized.project.startDate, DEFAULT_START_DATE);
  assert.equal(normalized.people[0].color, COLORS[0]);
  assert.equal(normalized.people[0].hourlyCost, 0);
  assert.deepEqual(normalized.project.phases[0].assignments, [{ personId: validPersonId }]);
});

test("normalization rejects unsupported future schemas", () => {
  const future = structuredClone(initialWorkspace());
  future.schemaVersion = 999;
  assert.equal(normalizeWorkspace(future), null);
});

test("Russian rubles replace pounds without losing saved currency selections", () => {
  const currentRubles = structuredClone(initialWorkspace());
  currentRubles.project.currency = "RUB";
  assert.equal(normalizeWorkspace(currentRubles)?.project.currency, "RUB");

  const legacyPounds = structuredClone(initialWorkspace());
  legacyPounds.schemaVersion = 6;
  legacyPounds.project.currency = "GBP";
  const migrated = normalizeWorkspace(legacyPounds);

  assert.ok(migrated);
  assert.equal(migrated.schemaVersion, 7);
  assert.equal(migrated.project.currency, "RUB");
});

test("legacy clientRate and scenario workspaces migrate to the current project model", () => {
  const current = initialWorkspace();
  const legacyProject = structuredClone(current.project);
  legacyProject.clientRate = 77;
  delete legacyProject.baseHourlyPrice;
  legacyProject.id = "legacy-project";

  const legacy = {
    app: "voxe-pricing-studio",
    schemaVersion: 3,
    people: current.people,
    activeScenarioId: "legacy-project",
    scenarios: [legacyProject],
  };
  const normalized = normalizeWorkspace(legacy);

  assert.ok(normalized);
  assert.equal(normalized.app, "voxegroup-project-planner");
  assert.equal(normalized.project.baseHourlyPrice, 77);
  assert.equal("clientRate" in normalized.project, false);
  assert.equal(normalized.schemaVersion, 7);
});

test("selectors centralize assigned-team and decision summaries", () => {
  const workspace = initialWorkspace();
  const result = calculateScenario(workspace.project, workspace.people);
  const analytics = selectDecisionAnalytics(workspace.project, result);
  const breakdown = selectQuoteBreakdown(workspace.project, result);

  assert.equal(selectAssignedPeopleCount(workspace.project, workspace.people), 6);
  assert.equal(analytics.status.label, "Cost covered");
  assert.equal(analytics.targetMarginQuotes.length, 3);
  assert.equal(breakdown.at(-1)?.label, "Manual adjustment");
});
