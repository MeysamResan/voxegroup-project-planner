import { uid } from "./defaults.ts";
import type {
  Assignment,
  Expense,
  Modifier,
  Person,
  Phase,
  ProjectPlan,
  Workspace,
} from "./types.ts";

export type ProjectPatch = Partial<
  Omit<ProjectPlan, "phases" | "expenses" | "modifiers">
>;
export type PhasePatch = Partial<Omit<Phase, "id" | "assignments">>;
export type ExpensePatch = Partial<Omit<Expense, "id">>;
export type ModifierPatch = Partial<Omit<Modifier, "id">>;
export type ModifierMode = "planning" | "pricing";

export type WorkspaceAction =
  | { type: "workspace/replace"; workspace: Workspace }
  | { type: "project/patch"; patch: ProjectPatch }
  | { type: "phase/add"; phase?: Partial<Phase> }
  | { type: "phase/update"; phaseId: string; patch: PhasePatch }
  | { type: "phase/remove"; phaseId: string }
  | { type: "phase/assign-person"; phaseId: string; personId: string }
  | { type: "phase/unassign-person"; phaseId: string; personId: string }
  | { type: "expense/add"; expense?: Partial<Expense> }
  | { type: "expense/update"; expenseId: string; patch: ExpensePatch }
  | { type: "expense/remove"; expenseId: string }
  | { type: "modifier/add"; mode?: ModifierMode; modifier?: Partial<Modifier> }
  | { type: "modifier/update"; modifierId: string; patch: ModifierPatch }
  | { type: "modifier/remove"; modifierId: string }
  | { type: "person/save"; person: Person }
  | { type: "person/delete"; personId: string };

const validId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const uniqueAssignments = (
  assignments: readonly Assignment[],
  validPersonIds?: ReadonlySet<string>,
): Assignment[] => {
  const seen = new Set<string>();

  return assignments.flatMap((assignment) => {
    const { personId } = assignment;
    if (!validId(personId) || seen.has(personId) || (validPersonIds && !validPersonIds.has(personId))) {
      return [];
    }
    seen.add(personId);
    return [{ personId }];
  });
};

/** Creates the standard phase used by the delivery planner. */
export const createPhase = (overrides: Partial<Phase> = {}): Phase => ({
  id: validId(overrides.id) ? overrides.id : uid(),
  name: overrides.name ?? "New phase",
  days: overrides.days ?? 5,
  assignments: uniqueAssignments(overrides.assignments ?? []),
});

/** Creates the standard internal, one-time expense. */
export const createExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: validId(overrides.id) ? overrides.id : uid(),
  name: overrides.name ?? "New expense",
  notes: overrides.notes ?? "",
  amount: overrides.amount ?? 0,
  unit: overrides.unit ?? "fixed",
  billing: overrides.billing ?? "internal",
  markup: overrides.markup ?? 0,
});

/**
 * Creates the standard modifier for either a planning or pricing workflow.
 * Planning adjusts effort by percentage; pricing adjusts price by a fixed value.
 */
export const createModifier = (
  mode: ModifierMode = "pricing",
  overrides: Partial<Modifier> = {},
): Modifier => ({
  id: validId(overrides.id) ? overrides.id : uid(),
  name: overrides.name ?? (mode === "planning" ? "New effort adjustment" : "New modifier"),
  notes: overrides.notes ?? "",
  kind: overrides.kind ?? (mode === "planning" ? "percentage" : "fixed"),
  target: overrides.target ?? (mode === "planning" ? "effort" : "price"),
  value: overrides.value ?? 0,
});

const copyWithout = <T extends object>(
  value: Partial<T>,
  blockedKeys: readonly (keyof T)[],
): Partial<T> => {
  const copy = { ...value };
  for (const key of blockedKeys) delete copy[key];
  return copy;
};

const patchChangesValue = <T extends object>(value: T, patch: Partial<T>): boolean =>
  (Object.keys(patch) as (keyof T)[]).some(
    (key) => !Object.is(value[key], patch[key]),
  );

const updateEntity = <T extends { id: string }>(
  entities: T[],
  entityId: string,
  patch: Partial<Omit<T, "id">>,
  additionalBlockedKeys: readonly (keyof T)[] = [],
): T[] | null => {
  const index = entities.findIndex((entity) => entity.id === entityId);
  if (index < 0) return null;

  const safePatch = copyWithout(
    patch as Partial<T>,
    ["id", ...additionalBlockedKeys] as (keyof T)[],
  );
  if (!patchChangesValue(entities[index], safePatch)) return entities;
  const updated = [...entities];
  updated[index] = { ...entities[index], ...safePatch };
  return updated;
};

const containsId = <T extends { id: string }>(entities: readonly T[], id: string): boolean =>
  entities.some((entity) => entity.id === id);

export const workspaceReducer = (
  workspace: Workspace,
  action: WorkspaceAction,
): Workspace => {
  switch (action.type) {
    case "workspace/replace":
      // Imports are normalized before dispatch, so replacement needs no migration here.
      return action.workspace;

    case "project/patch": {
      const patch = copyWithout(
        action.patch as Partial<ProjectPlan>,
        ["phases", "expenses", "modifiers"],
      );
      if (!patchChangesValue(workspace.project, patch)) return workspace;
      return {
        ...workspace,
        project: { ...workspace.project, ...patch },
      };
    }

    case "phase/add": {
      const phase = createPhase(action.phase);
      if (containsId(workspace.project.phases, phase.id)) return workspace;

      const validPersonIds = new Set(workspace.people.map((person) => person.id));
      const safePhase = {
        ...phase,
        assignments: uniqueAssignments(phase.assignments, validPersonIds),
      };
      return {
        ...workspace,
        project: {
          ...workspace.project,
          phases: [...workspace.project.phases, safePhase],
        },
      };
    }

    case "phase/update": {
      const phases = updateEntity(
        workspace.project.phases,
        action.phaseId,
        action.patch,
        ["assignments"],
      );
      if (!phases || phases === workspace.project.phases) return workspace;
      return { ...workspace, project: { ...workspace.project, phases } };
    }

    case "phase/remove": {
      if (!containsId(workspace.project.phases, action.phaseId)) return workspace;
      return {
        ...workspace,
        project: {
          ...workspace.project,
          phases: workspace.project.phases.filter((phase) => phase.id !== action.phaseId),
        },
      };
    }

    case "phase/assign-person": {
      if (!containsId(workspace.people, action.personId)) return workspace;
      const phase = workspace.project.phases.find((item) => item.id === action.phaseId);
      if (!phase || phase.assignments.some(({ personId }) => personId === action.personId)) {
        return workspace;
      }

      const phases = workspace.project.phases.map((item) =>
        item.id === action.phaseId
          ? { ...item, assignments: [...item.assignments, { personId: action.personId }] }
          : item,
      );
      return { ...workspace, project: { ...workspace.project, phases } };
    }

    case "phase/unassign-person": {
      if (!containsId(workspace.people, action.personId)) return workspace;
      const phase = workspace.project.phases.find((item) => item.id === action.phaseId);
      if (!phase || !phase.assignments.some(({ personId }) => personId === action.personId)) {
        return workspace;
      }

      const phases = workspace.project.phases.map((item) =>
        item.id === action.phaseId
          ? {
              ...item,
              assignments: item.assignments.filter(({ personId }) => personId !== action.personId),
            }
          : item,
      );
      return { ...workspace, project: { ...workspace.project, phases } };
    }

    case "expense/add": {
      const expense = createExpense(action.expense);
      if (containsId(workspace.project.expenses, expense.id)) return workspace;
      return {
        ...workspace,
        project: {
          ...workspace.project,
          expenses: [...workspace.project.expenses, expense],
        },
      };
    }

    case "expense/update": {
      const expenses = updateEntity(
        workspace.project.expenses,
        action.expenseId,
        action.patch,
      );
      if (!expenses || expenses === workspace.project.expenses) return workspace;
      return { ...workspace, project: { ...workspace.project, expenses } };
    }

    case "expense/remove": {
      if (!containsId(workspace.project.expenses, action.expenseId)) return workspace;
      return {
        ...workspace,
        project: {
          ...workspace.project,
          expenses: workspace.project.expenses.filter((expense) => expense.id !== action.expenseId),
        },
      };
    }

    case "modifier/add": {
      const modifier = createModifier(action.mode, action.modifier);
      if (containsId(workspace.project.modifiers, modifier.id)) return workspace;
      return {
        ...workspace,
        project: {
          ...workspace.project,
          modifiers: [...workspace.project.modifiers, modifier],
        },
      };
    }

    case "modifier/update": {
      const modifiers = updateEntity(
        workspace.project.modifiers,
        action.modifierId,
        action.patch,
      );
      if (!modifiers || modifiers === workspace.project.modifiers) return workspace;
      return { ...workspace, project: { ...workspace.project, modifiers } };
    }

    case "modifier/remove": {
      if (!containsId(workspace.project.modifiers, action.modifierId)) return workspace;
      return {
        ...workspace,
        project: {
          ...workspace.project,
          modifiers: workspace.project.modifiers.filter(
            (modifier) => modifier.id !== action.modifierId,
          ),
        },
      };
    }

    case "person/save": {
      if (!validId(action.person.id)) return workspace;
      const person = { ...action.person };
      const existingIndex = workspace.people.findIndex((item) => item.id === person.id);
      if (
        existingIndex >= 0 &&
        !patchChangesValue(workspace.people[existingIndex], person)
      ) {
        return workspace;
      }
      const people = [...workspace.people];
      if (existingIndex < 0) people.push(person);
      else people[existingIndex] = person;
      return { ...workspace, people };
    }

    case "person/delete": {
      if (!containsId(workspace.people, action.personId)) return workspace;
      return {
        ...workspace,
        people: workspace.people.filter((person) => person.id !== action.personId),
        project: {
          ...workspace.project,
          phases: workspace.project.phases.map((phase) => ({
            ...phase,
            assignments: phase.assignments.filter(
              ({ personId }) => personId !== action.personId,
            ),
          })),
        },
      };
    }
  }
};

export const workspaceActions = {
  replaceWorkspace: (workspace: Workspace): WorkspaceAction => ({
    type: "workspace/replace",
    workspace,
  }),
  patchProject: (patch: ProjectPatch): WorkspaceAction => ({ type: "project/patch", patch }),
  addPhase: (phase?: Partial<Phase>): WorkspaceAction => ({ type: "phase/add", phase }),
  updatePhase: (phaseId: string, patch: PhasePatch): WorkspaceAction => ({
    type: "phase/update",
    phaseId,
    patch,
  }),
  removePhase: (phaseId: string): WorkspaceAction => ({ type: "phase/remove", phaseId }),
  assignPerson: (phaseId: string, personId: string): WorkspaceAction => ({
    type: "phase/assign-person",
    phaseId,
    personId,
  }),
  unassignPerson: (phaseId: string, personId: string): WorkspaceAction => ({
    type: "phase/unassign-person",
    phaseId,
    personId,
  }),
  addExpense: (expense?: Partial<Expense>): WorkspaceAction => ({ type: "expense/add", expense }),
  updateExpense: (expenseId: string, patch: ExpensePatch): WorkspaceAction => ({
    type: "expense/update",
    expenseId,
    patch,
  }),
  removeExpense: (expenseId: string): WorkspaceAction => ({ type: "expense/remove", expenseId }),
  addModifier: (mode: ModifierMode = "pricing", modifier?: Partial<Modifier>): WorkspaceAction => ({
    type: "modifier/add",
    mode,
    modifier,
  }),
  updateModifier: (modifierId: string, patch: ModifierPatch): WorkspaceAction => ({
    type: "modifier/update",
    modifierId,
    patch,
  }),
  removeModifier: (modifierId: string): WorkspaceAction => ({
    type: "modifier/remove",
    modifierId,
  }),
  savePerson: (person: Person): WorkspaceAction => ({ type: "person/save", person }),
  deletePerson: (personId: string): WorkspaceAction => ({ type: "person/delete", personId }),
};
