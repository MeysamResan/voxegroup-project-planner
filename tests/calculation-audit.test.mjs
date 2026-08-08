import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_START_DATE,
  addDays,
  calendarDateFromString,
  calculationInputKey,
  calculateScenario,
  dateFromString,
  dateKey,
  initialWorkspace,
  normalizeWorkspace,
  selectDecisionAnalytics,
  selectQuoteBreakdown,
  workDateAtOffset,
  workDatesAtOffsets,
} from "../lib/pricing/index.ts";

const closeTo = (actual, expected, epsilon = 1e-9) => {
  const tolerance = epsilon * Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
};

const makePerson = (id, hourlyCost) => ({
  id,
  name: id,
  type: "Employee",
  role: "Delivery",
  department: "Delivery",
  email: "",
  phone: "",
  location: "",
  skills: "",
  notes: "",
  hourlyCost,
  color: "#6750a4",
});

const makeProject = (overrides = {}) => ({
  projectName: "Calculation audit",
  currency: "USD",
  startDate: "2026-01-05",
  baseHourlyPrice: 50,
  baseHourlyPriceNotes: "",
  fixedFee: 0,
  fixedFeeNotes: "",
  defaultHours: 8,
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
  phases: [],
  expenses: [],
  modifiers: [],
  manualAdjustment: 0,
  adjustmentReason: "",
  ...overrides,
});

test("calculation memo keys ignore display edits and track every numeric input", () => {
  const workspace = initialWorkspace();
  const originalKey = calculationInputKey(workspace.project, workspace.people);
  const displayOnly = structuredClone(workspace);
  displayOnly.project.projectName = "Renamed project";
  displayOnly.project.currency = "EUR";
  displayOnly.project.baseHourlyPriceNotes = "Updated note";
  displayOnly.project.fixedFeeNotes = "Updated note";
  displayOnly.project.adjustmentReason = "Updated reason";
  displayOnly.project.phases[0].name = "Renamed phase";
  displayOnly.project.expenses[0].name = "Renamed expense";
  displayOnly.project.expenses[0].notes = "Updated expense note";
  displayOnly.project.modifiers[0].name = "Renamed modifier";
  displayOnly.project.modifiers[0].notes = "Updated modifier note";
  displayOnly.people[0].name = "Renamed person";
  displayOnly.people[0].notes = "Updated profile note";
  assert.equal(calculationInputKey(displayOnly.project, displayOnly.people), originalKey);

  const relevantChanges = [
    (copy) => { copy.project.startDate = "2026-08-12"; },
    (copy) => { copy.project.workingDays = [1, 2, 3, 4]; },
    (copy) => { copy.project.holidays = ["2026-08-13"]; },
    (copy) => { copy.project.phases[0].days += 1; },
    (copy) => { copy.project.phases[0].assignments = []; },
    (copy) => { copy.project.expenses[0].amount += 1; },
    (copy) => { copy.project.modifiers[0].value += 1; },
    (copy) => { copy.people[0].hourlyCost += 1; },
  ];
  for (const change of relevantChanges) {
    const changed = structuredClone(workspace);
    change(changed);
    assert.notEqual(calculationInputKey(changed.project, changed.people), originalKey);
  }
});

test("hand-calculated hours, costs, dates, expenses, modifiers, and quote all agree", () => {
  const people = [makePerson("a", 10), makePerson("b", 20)];
  const project = makeProject({
    holidays: ["2026-01-07"],
    fixedFee: 500,
    phases: [
      {
        id: "discovery",
        name: "Discovery",
        days: 2,
        assignments: [{ personId: "a" }, { personId: "b" }],
      },
      {
        id: "delivery",
        name: "Delivery",
        days: 3,
        assignments: [{ personId: "b" }],
      },
    ],
    expenses: [
      {
        id: "fixed",
        name: "Fixed internal",
        notes: "",
        amount: 100,
        unit: "fixed",
        billing: "internal",
        markup: 0,
      },
      {
        id: "hour",
        name: "Per person-hour",
        notes: "",
        amount: 2,
        unit: "person_hour",
        billing: "pass_through",
        markup: 0,
      },
      {
        id: "workday",
        name: "Per workday",
        notes: "",
        amount: 3,
        unit: "workday",
        billing: "markup",
        markup: 10,
      },
      {
        id: "calendar",
        name: "Per calendar day",
        notes: "",
        amount: 4,
        unit: "calendar_day",
        billing: "pass_through",
        markup: 0,
      },
      {
        id: "month",
        name: "Monthly",
        notes: "",
        amount: 304,
        unit: "month",
        billing: "markup",
        markup: 25,
      },
    ],
    modifiers: [
      { id: "effort-percent", name: "Effort", notes: "", kind: "percentage", target: "effort", value: 25 },
      { id: "effort-fixed", name: "Extra hours", notes: "", kind: "fixed", target: "effort", value: 14 },
      { id: "price-percent", name: "Price", notes: "", kind: "percentage", target: "price", value: 10 },
      { id: "price-fixed", name: "Discount", notes: "", kind: "fixed", target: "price", value: -200 },
    ],
    manualAdjustment: -50,
    adjustmentReason: "Final negotiated adjustment",
  });

  const result = calculateScenario(project, people);

  assert.equal(result.rawHours, 56);
  assert.equal(result.totalHours, 84);
  assert.equal(result.laborCost, 1440);
  assert.equal(result.totalWorkingDays, 5);
  assert.equal(result.projectStart, "2026-01-05");
  assert.equal(result.projectEnd, "2026-01-12");
  assert.equal(result.calendarDays, 8);
  assert.deepEqual(
    result.phaseResults.map(({ id, rawHours, adjustedHours, laborCost, start, end }) => ({
      id,
      rawHours,
      adjustedHours,
      laborCost,
      start,
      end,
    })),
    [
      {
        id: "discovery",
        rawHours: 32,
        adjustedHours: 48,
        laborCost: 720,
        start: "2026-01-05",
        end: "2026-01-06",
      },
      {
        id: "delivery",
        rawHours: 24,
        adjustedHours: 36,
        laborCost: 720,
        start: "2026-01-08",
        end: "2026-01-12",
      },
    ],
  );
  closeTo(result.expenseResults.find((expense) => expense.id === "fixed").cost, 100);
  closeTo(result.expenseResults.find((expense) => expense.id === "fixed").billable, 0);
  closeTo(result.expenseResults.find((expense) => expense.id === "hour").cost, 168);
  closeTo(result.expenseResults.find((expense) => expense.id === "hour").billable, 168);
  closeTo(result.expenseResults.find((expense) => expense.id === "workday").cost, 15);
  closeTo(result.expenseResults.find((expense) => expense.id === "workday").billable, 16.5);
  closeTo(result.expenseResults.find((expense) => expense.id === "calendar").cost, 32);
  closeTo(result.expenseResults.find((expense) => expense.id === "calendar").billable, 32);
  closeTo(result.expenseResults.find((expense) => expense.id === "month").cost, 80);
  closeTo(result.expenseResults.find((expense) => expense.id === "month").billable, 100);
  closeTo(result.expenseCost, 395);
  closeTo(result.billableExpenses, 316.5);
  closeTo(result.baseRevenue, 4700);
  closeTo(result.modifierRevenue, 270);
  closeTo(result.quote, 5236.5);
  closeTo(result.estimatedCost, 1835);
  closeTo(result.grossProfit, 3401.5);
  closeTo(result.grossMargin, (3401.5 / 5236.5) * 100);
  assert.deepEqual(result.warnings, []);

  const analytics = selectDecisionAnalytics(project, result, [0, 25, 50, 100]);
  closeTo(analytics.quoteBeforeFloor, 5236.5);
  closeTo(analytics.quoteFloorAdjustment, 0);
  closeTo(analytics.costCoverage, (5236.5 / 1835) * 100);
  closeTo(analytics.markupOnCost, (3401.5 / 1835) * 100);
  closeTo(analytics.serviceRevenuePerHour, (5236.5 - 316.5) / 84);
  closeTo(analytics.laborCostPerHour, 1440 / 84);
  closeTo(analytics.laborCostShare + analytics.expenseCostShare, 100);
  assert.deepEqual(
    analytics.targetMarginQuotes.map(({ margin, quote }) => [margin, quote]),
    [
      [0, 1835],
      [25, 1835 / 0.75],
      [50, 3670],
      [100, null],
    ],
  );
  closeTo(
    selectQuoteBreakdown(project, result).reduce((sum, item) => sum + item.value, 0),
    result.quote,
  );
});

test("the zero-price floor is explicit and quote reconciliation remains exact", () => {
  const project = makeProject({
    fixedFee: 100,
    modifiers: [
      { id: "discount", name: "Discount", notes: "", kind: "fixed", target: "price", value: -300 },
    ],
    manualAdjustment: -50,
  });
  const result = calculateScenario(project, []);
  const breakdown = selectQuoteBreakdown(project, result);

  assert.equal(result.baseRevenue, 100);
  assert.equal(result.modifierRevenue, -300);
  assert.equal(result.quote, 0);
  assert.equal(breakdown.at(-1).label, "Zero-price floor");
  assert.equal(breakdown.at(-1).value, 250);
  closeTo(breakdown.reduce((sum, item) => sum + item.value, 0), result.quote);
});

test("fixed effort is allocated to phases even when raw hours are zero", () => {
  const people = [makePerson("a", 10), makePerson("b", 20)];
  const fixedEffort = {
    id: "fixed-effort",
    name: "Fixed effort",
    notes: "",
    kind: "fixed",
    target: "effort",
    value: 20,
  };
  const phases = [
    { id: "a-phase", name: "A", days: 2, assignments: [{ personId: "a" }] },
    { id: "b-phase", name: "B", days: 3, assignments: [{ personId: "b" }] },
  ];
  const result = calculateScenario(
    makeProject({ defaultHours: 0, phases, modifiers: [fixedEffort] }),
    people,
  );

  assert.equal(result.rawHours, 0);
  assert.equal(result.totalHours, 20);
  assert.deepEqual(result.phaseResults.map((phase) => phase.adjustedHours), [8, 12]);
  assert.deepEqual(result.phaseResults.map((phase) => phase.laborCost), [80, 240]);
  assert.equal(result.laborCost, 320);
  closeTo(
    result.phaseResults.reduce((sum, phase) => sum + phase.adjustedHours, 0),
    result.totalHours,
  );
  closeTo(
    result.phaseResults.reduce((sum, phase) => sum + phase.laborCost, 0),
    result.laborCost,
  );

  const zeroDayResult = calculateScenario(
    makeProject({
      defaultHours: 0,
      phases: phases.map((phase) => ({ ...phase, days: 0 })),
      modifiers: [fixedEffort],
    }),
    people,
  );
  assert.equal(zeroDayResult.totalWorkingDays, 0);
  assert.equal(zeroDayResult.projectStart, "");
  assert.equal(zeroDayResult.projectEnd, "");
  assert.equal(zeroDayResult.calendarDays, 0);
  assert.deepEqual(zeroDayResult.phaseResults.map((phase) => phase.adjustedHours), [10, 10]);
  assert.deepEqual(zeroDayResult.phaseResults.map((phase) => phase.laborCost), [100, 200]);
  assert.ok(zeroDayResult.phaseResults.every((phase) => !phase.start && !phase.end));
  assert.ok(zeroDayResult.planningWarnings.includes("One or more phases have no workdays."));
});

test("invalid and duplicate assignments cannot create zero-cost billable labor", () => {
  const people = [makePerson("a", 10), makePerson("b", 20)];
  const result = calculateScenario(
    makeProject({
      phases: [
        {
          id: "duplicate-id",
          name: "First",
          days: 1,
          assignments: [
            { personId: "a" },
            { personId: "a" },
            { personId: "missing" },
          ],
        },
        {
          id: "duplicate-id",
          name: "Second",
          days: 1,
          assignments: [{ personId: "b" }],
        },
      ],
    }),
    people,
  );

  assert.equal(result.rawHours, 16);
  assert.equal(result.laborCost, 240);
  assert.deepEqual(result.phaseResults.map((phase) => phase.rawHours), [8, 8]);
  assert.deepEqual(result.phaseResults.map((phase) => phase.laborCost), [80, 160]);
});

test("strict calendar math handles invalid dates, long holiday runs, and large offsets", () => {
  assert.equal(calendarDateFromString("2026-02-30"), null);
  assert.equal(dateKey(dateFromString("2026-02-30")), DEFAULT_START_DATE);
  assert.equal(workDateAtOffset("2026-01-05", 2, [8, -1], []), null);
  assert.equal(workDateAtOffset("2026-01-05", Number.POSITIVE_INFINITY, [1], []), null);

  const start = dateFromString("2026-01-01");
  const holidays = Array.from({ length: 380 }, (_, index) => dateKey(addDays(start, index)));
  const afterHolidayRun = workDateAtOffset(
    "2026-01-01",
    0,
    [0, 1, 2, 3, 4, 5, 6],
    holidays,
  );
  assert.ok(afterHolidayRun);
  assert.equal(dateKey(afterHolidayRun), dateKey(addDays(start, 380)));
  assert.ok(!holidays.includes(dateKey(afterHolidayRun)));

  const largeOffset = workDateAtOffset("2026-01-05", 6000, [1, 2, 3, 4, 5], []);
  assert.ok(largeOffset);
  const expected = addDays(dateFromString("2026-01-05"), 6000 / 5 * 7);
  assert.equal(dateKey(largeOffset), dateKey(expected));
  assert.ok([1, 2, 3, 4, 5].includes(largeOffset.getDay()));

  const bulkDates = workDatesAtOffsets(
    "2026-01-05",
    [2, 0, 2, -4, Number.POSITIVE_INFINITY],
    [1, 2, 3, 4, 5],
    ["2026-01-06"],
  );
  assert.deepEqual(
    bulkDates.map((date) => date ? dateKey(date) : null),
    ["2026-01-08", "2026-01-05", "2026-01-08", "2026-01-05", null],
  );
  assert.notEqual(bulkDates[0], bulkDates[2]);
  assert.deepEqual(
    workDatesAtOffsets("2026-01-05", [0, 10], [8, -1], []),
    [null, null],
  );
});

test("large phase schedules use one monotonic calendar walk", { concurrency: false }, () => {
  const phaseCount = 2_000;
  const project = makeProject({
    phases: Array.from({ length: phaseCount }, (_, index) => ({
      id: `phase-${index}`,
      name: `Phase ${index + 1}`,
      days: 1,
      assignments: [],
    })),
  });
  const originalSetDate = Object.getOwnPropertyDescriptor(Date.prototype, "setDate");
  assert.ok(originalSetDate?.value);
  let calendarDayAdvances = 0;
  let result;

  Object.defineProperty(Date.prototype, "setDate", {
    ...originalSetDate,
    value(...args) {
      calendarDayAdvances += 1;
      return Reflect.apply(originalSetDate.value, this, args);
    },
  });
  try {
    result = calculateScenario(project, []);
  } finally {
    Object.defineProperty(Date.prototype, "setDate", originalSetDate);
  }

  assert.equal(result.phaseResults.length, phaseCount);
  assert.equal(result.phaseResults[0].start, result.projectStart);
  assert.equal(result.phaseResults.at(-1).end, result.projectEnd);
  assert.ok(result.calendarDays > phaseCount);
  assert.equal(
    calendarDayAdvances,
    result.calendarDays - 1,
    "the calendar should advance exactly once per calendar date in the project span",
  );
});

test("workspace normalization enforces every numeric and calendar input contract", () => {
  const unsafe = structuredClone(initialWorkspace());
  unsafe.people[0].hourlyCost = -50;
  unsafe.project.baseHourlyPrice = -100;
  unsafe.project.fixedFee = -200;
  unsafe.project.defaultHours = 99;
  unsafe.project.phases[0].days = -3;
  unsafe.project.phases[1].days = 2.6;
  unsafe.project.expenses[0].amount = -20;
  unsafe.project.expenses[0].markup = -40;
  unsafe.project.workingDays = [5, 1, 5, 8, -1];
  unsafe.project.holidays = ["2026-12-31", "bad", "2026-01-02", "2026-12-31"];
  unsafe.project.modifiers[0].value = -25;
  unsafe.project.manualAdjustment = -500;

  const normalized = normalizeWorkspace(unsafe);
  assert.ok(normalized);
  assert.equal(normalized.people[0].hourlyCost, 0);
  assert.equal(normalized.project.baseHourlyPrice, 0);
  assert.equal(normalized.project.fixedFee, 0);
  assert.equal(normalized.project.defaultHours, 24);
  assert.equal(normalized.project.phases[0].days, 0);
  assert.equal(normalized.project.phases[1].days, 3);
  assert.equal(normalized.project.expenses[0].amount, 0);
  assert.equal(normalized.project.expenses[0].markup, 0);
  assert.deepEqual(normalized.project.workingDays, [1, 5]);
  assert.deepEqual(normalized.project.holidays, ["2026-01-02", "2026-12-31"]);
  assert.equal(normalized.project.modifiers[0].value, -25);
  assert.equal(normalized.project.manualAdjustment, -500);
});

test("every planning and pricing input feeds the intended calculation", () => {
  const person = makePerson("a", 10);
  const phase = {
    id: "delivery",
    name: "Delivery",
    days: 5,
    assignments: [{ personId: "a" }],
  };
  const expense = {
    id: "hosting",
    name: "Hosting",
    notes: "",
    amount: 5,
    unit: "calendar_day",
    billing: "markup",
    markup: 0,
  };
  const project = makeProject({ fixedFee: 100, phases: [phase], expenses: [expense] });
  const baseline = calculateScenario(project, [person]);

  assert.equal(baseline.rawHours, 40);
  assert.equal(baseline.totalHours, 40);
  assert.equal(baseline.laborCost, 400);
  assert.equal(baseline.expenseCost, 25);
  assert.equal(baseline.baseRevenue, 2100);
  assert.equal(baseline.quote, 2125);
  assert.equal(baseline.estimatedCost, 425);
  assert.equal(baseline.calendarDays, 5);

  assert.equal(
    calculateScenario({ ...project, defaultHours: 4 }, [person]).quote,
    1125,
  );
  const longerPhase = calculateScenario(
    { ...project, phases: [{ ...phase, days: 6 }] },
    [person],
  );
  assert.equal(longerPhase.totalWorkingDays, 6);
  assert.equal(longerPhase.calendarDays, 8);
  assert.equal(longerPhase.quote, 2540);

  const shorterWeek = calculateScenario(
    { ...project, workingDays: [1, 2, 3, 4] },
    [person],
  );
  assert.equal(shorterWeek.projectEnd, "2026-01-12");
  assert.equal(shorterWeek.calendarDays, 8);
  assert.equal(shorterWeek.quote, 2140);
  const holiday = calculateScenario(
    { ...project, holidays: ["2026-01-07"] },
    [person],
  );
  assert.equal(holiday.projectEnd, "2026-01-12");
  assert.equal(holiday.calendarDays, 8);
  assert.equal(holiday.quote, 2140);
  const laterStart = calculateScenario(
    { ...project, startDate: "2026-01-06" },
    [person],
  );
  assert.equal(laterStart.projectStart, "2026-01-06");
  assert.equal(laterStart.projectEnd, "2026-01-12");
  assert.equal(laterStart.calendarDays, 7);
  assert.equal(laterStart.quote, 2135);

  const higherCost = calculateScenario(project, [{ ...person, hourlyCost: 20 }]);
  assert.equal(higherCost.quote, baseline.quote);
  assert.equal(higherCost.laborCost, 800);
  assert.equal(higherCost.estimatedCost, 825);
  const unassigned = calculateScenario(
    { ...project, phases: [{ ...phase, assignments: [] }] },
    [person],
  );
  assert.equal(unassigned.totalHours, 0);
  assert.equal(unassigned.laborCost, 0);
  assert.equal(unassigned.quote, 125);

  assert.equal(
    calculateScenario({ ...project, baseHourlyPrice: 60 }, [person]).quote,
    2525,
  );
  assert.equal(
    calculateScenario({ ...project, fixedFee: 200 }, [person]).quote,
    2225,
  );
  const effortPercent = {
    id: "effort-percent",
    name: "Effort",
    notes: "",
    kind: "percentage",
    target: "effort",
    value: 25,
  };
  const effortPercentResult = calculateScenario(
    { ...project, modifiers: [effortPercent] },
    [person],
  );
  assert.equal(effortPercentResult.totalHours, 50);
  assert.equal(effortPercentResult.laborCost, 500);
  assert.equal(effortPercentResult.quote, 2625);
  const effortFixedResult = calculateScenario(
    { ...project, modifiers: [{ ...effortPercent, kind: "fixed", value: 8 }] },
    [person],
  );
  assert.equal(effortFixedResult.totalHours, 48);
  assert.equal(effortFixedResult.laborCost, 480);
  assert.equal(effortFixedResult.quote, 2525);
  const pricePercentResult = calculateScenario(
    { ...project, modifiers: [{ ...effortPercent, target: "price", value: 10 }] },
    [person],
  );
  assert.equal(pricePercentResult.modifierRevenue, 210);
  assert.equal(pricePercentResult.quote, 2335);
  const priceFixedResult = calculateScenario(
    {
      ...project,
      modifiers: [{ ...effortPercent, target: "price", kind: "fixed", value: 100 }],
    },
    [person],
  );
  assert.equal(priceFixedResult.modifierRevenue, 100);
  assert.equal(priceFixedResult.quote, 2225);

  assert.equal(
    calculateScenario(
      { ...project, expenses: [{ ...expense, amount: 10 }] },
      [person],
    ).quote,
    2150,
  );
  assert.equal(
    calculateScenario(
      { ...project, expenses: [{ ...expense, unit: "fixed" }] },
      [person],
    ).quote,
    2105,
  );
  const internalExpense = calculateScenario(
    { ...project, expenses: [{ ...expense, billing: "internal" }] },
    [person],
  );
  assert.equal(internalExpense.expenseCost, 25);
  assert.equal(internalExpense.billableExpenses, 0);
  assert.equal(internalExpense.quote, 2100);
  const markedUpExpense = calculateScenario(
    { ...project, expenses: [{ ...expense, markup: 20 }] },
    [person],
  );
  assert.equal(markedUpExpense.expenseCost, 25);
  assert.equal(markedUpExpense.billableExpenses, 30);
  assert.equal(markedUpExpense.quote, 2130);
  assert.equal(
    calculateScenario({ ...project, manualAdjustment: 100 }, [person]).quote,
    2225,
  );
});

test("calculation invariants hold across a deterministic edge-case matrix", () => {
  const people = [makePerson("a", 12.5), makePerson("b", 27.25)];
  const workweeks = [
    [1, 2, 3, 4, 5],
    [1, 3, 5],
    [0, 1, 2, 3, 4, 5, 6],
  ];
  const hourOptions = [0, 6.5, 24, 30, -2];
  const effortPercentOptions = [-125, -25, 0, 35];
  const fixedEffortOptions = [-12, 0, 18];

  for (let index = 0; index < 60; index += 1) {
    const firstDays = [0, 1, 2.4, 7][index % 4];
    const secondDays = [0, 3, 1.6][index % 3];
    const workingDays = workweeks[index % workweeks.length];
    const holidays = index % 2 === 0 ? ["2026-01-05", "2026-01-08"] : [];
    const project = makeProject({
      defaultHours: hourOptions[index % hourOptions.length],
      workingDays,
      holidays,
      fixedFee: 100,
      phases: [
        {
          id: `phase-a-${index}`,
          name: "A",
          days: firstDays,
          assignments: [{ personId: "a" }, { personId: "b" }],
        },
        {
          id: `phase-b-${index}`,
          name: "B",
          days: secondDays,
          assignments: [{ personId: "b" }],
        },
      ],
      expenses: [
        { id: `fixed-${index}`, name: "Fixed", notes: "", amount: 9, unit: "fixed", billing: "internal", markup: 0 },
        { id: `hour-${index}`, name: "Hour", notes: "", amount: 1.25, unit: "person_hour", billing: "pass_through", markup: 0 },
        { id: `work-${index}`, name: "Workday", notes: "", amount: 3, unit: "workday", billing: "markup", markup: 15 },
        { id: `calendar-${index}`, name: "Calendar", notes: "", amount: 2, unit: "calendar_day", billing: "pass_through", markup: 0 },
        { id: `month-${index}`, name: "Month", notes: "", amount: 304, unit: "month", billing: "markup", markup: index % 5 === 0 ? -25 : 10 },
      ],
      modifiers: [
        { id: `effort-pct-${index}`, name: "Effort percent", notes: "", kind: "percentage", target: "effort", value: effortPercentOptions[index % effortPercentOptions.length] },
        { id: `effort-fixed-${index}`, name: "Effort fixed", notes: "", kind: "fixed", target: "effort", value: fixedEffortOptions[index % fixedEffortOptions.length] },
        { id: `price-pct-${index}`, name: "Price percent", notes: "", kind: "percentage", target: "price", value: [-20, 0, 15][index % 3] },
        { id: `price-fixed-${index}`, name: "Price fixed", notes: "", kind: "fixed", target: "price", value: index % 2 ? 50 : -200 },
      ],
      manualAdjustment: index % 4 === 0 ? -500 : 25,
    });
    const result = calculateScenario(project, people);

    for (const [name, value] of Object.entries(result)) {
      if (typeof value === "number") {
        assert.ok(Number.isFinite(value), `Scenario ${index}: ${name} must be finite`);
      }
    }
    for (const phase of result.phaseResults) {
      for (const [name, value] of Object.entries(phase)) {
        if (typeof value === "number") {
          assert.ok(Number.isFinite(value), `Scenario ${index}: phase ${name} must be finite`);
        }
      }
    }
    for (const expense of result.expenseResults) {
      assert.ok(Number.isFinite(expense.cost) && expense.cost >= 0);
      assert.ok(Number.isFinite(expense.billable) && expense.billable >= 0);
    }

    const expectedWorkingDays = Math.round(Math.max(0, firstDays))
      + Math.round(Math.max(0, secondDays));
    assert.equal(result.totalWorkingDays, expectedWorkingDays);
    assert.ok(result.rawHours >= 0);
    assert.ok(result.totalHours >= 0);
    assert.ok(result.laborCost >= 0);
    assert.ok(result.expenseCost >= 0);
    assert.ok(result.estimatedCost >= 0);
    assert.ok(result.billableExpenses >= 0);
    assert.ok(result.baseRevenue >= 0);
    assert.ok(result.quote >= 0);
    closeTo(result.estimatedCost, result.laborCost + result.expenseCost);
    closeTo(result.grossProfit, result.quote - result.estimatedCost);
    closeTo(
      result.grossMargin,
      result.quote > 0 ? (result.grossProfit / result.quote) * 100 : 0,
    );
    closeTo(
      result.phaseResults.reduce((sum, phase) => sum + phase.rawHours, 0),
      result.rawHours,
    );
    closeTo(
      result.phaseResults.reduce((sum, phase) => sum + phase.adjustedHours, 0),
      result.totalHours,
    );
    closeTo(
      result.phaseResults.reduce((sum, phase) => sum + phase.laborCost, 0),
      result.laborCost,
    );
    closeTo(
      result.expenseResults.reduce((sum, expense) => sum + expense.cost, 0),
      result.expenseCost,
    );
    closeTo(
      result.expenseResults.reduce((sum, expense) => sum + expense.billable, 0),
      result.billableExpenses,
    );
    closeTo(
      selectQuoteBreakdown(project, result).reduce((sum, item) => sum + item.value, 0),
      result.quote,
    );

    if (expectedWorkingDays === 0) {
      assert.equal(result.projectStart, "");
      assert.equal(result.projectEnd, "");
      assert.equal(result.calendarDays, 0);
    } else {
      const startDate = calendarDateFromString(result.projectStart);
      const endDate = calendarDateFromString(result.projectEnd);
      assert.ok(startDate && endDate);
      assert.ok(workingDays.includes(startDate.getDay()));
      assert.ok(workingDays.includes(endDate.getDay()));
      assert.ok(!holidays.includes(result.projectStart));
      assert.ok(!holidays.includes(result.projectEnd));
      assert.equal(
        result.calendarDays,
        Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
      );
    }
    for (let phaseIndex = 0; phaseIndex < result.phaseResults.length; phaseIndex += 1) {
      const days = Math.round(Math.max(0, project.phases[phaseIndex].days));
      if (days === 0) {
        assert.equal(result.phaseResults[phaseIndex].start, "");
        assert.equal(result.phaseResults[phaseIndex].end, "");
      } else {
        assert.ok(calendarDateFromString(result.phaseResults[phaseIndex].start));
        assert.ok(calendarDateFromString(result.phaseResults[phaseIndex].end));
      }
    }
  }
});
