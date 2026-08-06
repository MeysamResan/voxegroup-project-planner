import assert from "node:assert/strict";
import test from "node:test";

import {
  COLORS,
  DEFAULT_START_DATE,
  calculateScenario,
  initialWorkspace,
  normalizeWorkspace,
  parsePlanningMode,
  selectAssignedPeopleCount,
  selectDecisionAnalytics,
  selectQuoteBreakdown,
} from "../lib/pricing/index.ts";

const closeTo = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);
};

test("default workspace calculation remains deterministic", () => {
  const workspace = initialWorkspace();
  const result = calculateScenario(workspace.project, workspace.people);

  assert.equal(result.rawHours, 480);
  closeTo(result.totalHours, 518.4);
  closeTo(result.laborCost, 8676.72);
  closeTo(result.expenseCost, 888);
  closeTo(result.quote, 34358.64);
  closeTo(result.grossProfit, 24793.92);
  assert.equal(result.totalWorkingDays, 40);
  assert.equal(result.calendarDays, 54);
  assert.equal(result.projectStart, "2026-08-09");
  assert.equal(result.projectEnd, "2026-10-01");
  assert.equal(result.phaseResults.length, 4);
  assert.deepEqual(result.warnings, []);
});

test("planning mode storage fails closed", () => {
  for (const storedValue of [null, undefined, "", "true", "TRUE", "False", "0", 0, false]) {
    assert.equal(parsePlanningMode(storedValue), true);
  }
  assert.equal(parsePlanningMode("false"), false);
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
  assert.equal(normalized.project.baseHourlyPrice, 77);
  assert.equal("clientRate" in normalized.project, false);
  assert.equal(normalized.schemaVersion, 7);
});

test("selectors centralize assigned-team and decision summaries", () => {
  const workspace = initialWorkspace();
  const result = calculateScenario(workspace.project, workspace.people);
  const analytics = selectDecisionAnalytics(workspace.project, result);
  const breakdown = selectQuoteBreakdown(workspace.project, result);

  assert.equal(selectAssignedPeopleCount(workspace.project, workspace.people), 4);
  assert.equal(analytics.status.label, "Cost covered");
  assert.equal(analytics.targetMarginQuotes.length, 3);
  assert.equal(breakdown.at(-1)?.label, "Manual adjustment");
});
