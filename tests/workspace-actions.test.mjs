import assert from "node:assert/strict";
import test from "node:test";

import { initialWorkspace } from "../lib/pricing/defaults.ts";
import {
  workspaceActions,
  workspaceReducer,
} from "../lib/pricing/workspace.ts";

test("person assignment is valid and unique", () => {
  const workspace = initialWorkspace();
  const phaseId = workspace.project.phases[0].id;
  const existingPersonId = workspace.project.phases[0].assignments[0].personId;
  const newPersonId = workspace.people.find((person) => (
    !workspace.project.phases[0].assignments.some((assignment) => assignment.personId === person.id)
  )).id;

  assert.equal(
    workspaceReducer(workspace, workspaceActions.assignPerson(phaseId, existingPersonId)),
    workspace,
  );
  assert.equal(
    workspaceReducer(workspace, workspaceActions.assignPerson(phaseId, "missing-person")),
    workspace,
  );

  const assigned = workspaceReducer(workspace, workspaceActions.assignPerson(phaseId, newPersonId));
  assert.equal(assigned.project.phases[0].assignments.at(-1)?.personId, newPersonId);
  assert.equal(workspace.project.phases[0].assignments.length + 1, assigned.project.phases[0].assignments.length);
});

test("deleting a person cascades through every phase assignment", () => {
  const workspace = initialWorkspace();
  const personId = workspace.people[1].id;
  const updated = workspaceReducer(workspace, workspaceActions.deletePerson(personId));

  assert.equal(updated.people.some((person) => person.id === personId), false);
  assert.equal(
    updated.project.phases.some((phase) => (
      phase.assignments.some((assignment) => assignment.personId === personId)
    )),
    false,
  );
});

test("entity updates cannot change stable IDs", () => {
  const workspace = initialWorkspace();
  const phaseId = workspace.project.phases[0].id;
  const updated = workspaceReducer(workspace, {
    type: "phase/update",
    phaseId,
    patch: { id: "replacement-id", name: "Renamed phase" },
  });

  assert.equal(updated.project.phases[0].id, phaseId);
  assert.equal(updated.project.phases[0].name, "Renamed phase");
});

test("same-value edits preserve workspace identity and skip downstream work", () => {
  const workspace = initialWorkspace();
  const phase = workspace.project.phases[0];
  const expense = workspace.project.expenses[0];
  const modifier = workspace.project.modifiers[0];
  const person = workspace.people[0];

  assert.equal(
    workspaceReducer(
      workspace,
      workspaceActions.patchProject({ projectName: workspace.project.projectName }),
    ),
    workspace,
  );
  assert.equal(
    workspaceReducer(workspace, workspaceActions.updatePhase(phase.id, { days: phase.days })),
    workspace,
  );
  assert.equal(
    workspaceReducer(
      workspace,
      workspaceActions.updateExpense(expense.id, { amount: expense.amount }),
    ),
    workspace,
  );
  assert.equal(
    workspaceReducer(
      workspace,
      workspaceActions.updateModifier(modifier.id, { value: modifier.value }),
    ),
    workspace,
  );
  assert.equal(
    workspaceReducer(workspace, workspaceActions.savePerson(person)),
    workspace,
  );

  const changed = workspaceReducer(
    workspace,
    workspaceActions.updatePhase(phase.id, { days: phase.days + 1 }),
  );
  assert.notEqual(changed, workspace);
  assert.equal(changed.people, workspace.people);
  assert.equal(changed.project.expenses, workspace.project.expenses);
  assert.equal(changed.project.modifiers, workspace.project.modifiers);
});

test("workspace replacement restores a fresh built-in preset", () => {
  const preset = initialWorkspace();
  const edited = workspaceReducer(
    preset,
    workspaceActions.patchProject({ projectName: "Temporary session project" }),
  );
  const restoredPreset = initialWorkspace();
  const reset = workspaceReducer(
    edited,
    workspaceActions.replaceWorkspace(restoredPreset),
  );

  assert.equal(reset, restoredPreset);
  assert.deepEqual(reset, initialWorkspace());
  assert.equal(reset.project.projectName, "Customer Operations Platform");
});

test("new phase, expense, and modifier defaults stay consistent", () => {
  let workspace = initialWorkspace();
  workspace = workspaceReducer(workspace, workspaceActions.addPhase());
  workspace = workspaceReducer(workspace, workspaceActions.addExpense());
  workspace = workspaceReducer(workspace, workspaceActions.addModifier("planning"));
  workspace = workspaceReducer(workspace, workspaceActions.addModifier("pricing"));

  assert.deepEqual(workspace.project.phases.at(-1), {
    id: workspace.project.phases.at(-1).id,
    name: "New phase",
    days: 5,
    assignments: [],
  });
  assert.deepEqual(workspace.project.expenses.at(-1), {
    id: workspace.project.expenses.at(-1).id,
    name: "New expense",
    notes: "",
    amount: 0,
    unit: "fixed",
    billing: "internal",
    markup: 0,
  });
  assert.equal(workspace.project.modifiers.at(-2).target, "effort");
  assert.equal(workspace.project.modifiers.at(-2).kind, "percentage");
  assert.equal(workspace.project.modifiers.at(-1).target, "price");
  assert.equal(workspace.project.modifiers.at(-1).kind, "fixed");
});
