"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppBackdrop } from "@/components/app/AppBackdrop";
import { Toast } from "@/components/ui";
import { downloadJson } from "@/lib/files/project-export";
import {
  calculateScenario,
  calculationInputKey,
  initialWorkspace,
  makePerson,
  normalizeWorkspace,
  safeFilename,
  workspaceActions,
  type DeliveryPanel,
  type ExpensePatch,
  type ModifierPatch,
  type Person,
  type PhasePatch,
  type ProjectPlan,
  type ProjectPatch,
  type ProjectSettingsPanel,
  type ViewMode,
} from "@/lib/pricing";

import {
  ClientEstimate,
  DecisionAnalytics,
  ExportDialog,
  OverviewMetrics,
  PersonEditorDialog,
  PhasesStaffing,
  ProjectSettings,
  ResetWorkspaceDialog,
  Topbar,
} from "./components";
import {
  useColorTheme,
  useLegacyBrowserCleanup,
  useProjectWorkspace,
  useToast,
} from "./hooks";

const MAX_IMPORT_BYTES = 5_000_000;
const PRINT_RESTORE_FALLBACK_MS = 1_000;

const StableAppBackdrop = memo(AppBackdrop);
const StableClientEstimate = memo(ClientEstimate);
const StableDecisionAnalytics = memo(DecisionAnalytics);
const StableOverviewMetrics = memo(OverviewMetrics);
const StablePhasesStaffing = memo(PhasesStaffing);
const StableProjectSettings = memo(ProjectSettings);
const StableTopbar = memo(Topbar);

type PrintSession = {
  finish: (restoreView?: boolean) => void;
};

function useScenarioCalculation(project: ProjectPlan, people: Person[]) {
  const inputKey = useMemo(
    () => calculationInputKey(project, people),
    [people, project],
  );
  // Every calculation-relevant value is encoded in inputKey. Display-only
  // object changes intentionally keep the previous deterministic result.
  return useMemo(
    () => calculateScenario(project, people),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputKey],
  );
}

export function ProjectPlanner() {
  const { message: toast, showToast } = useToast();
  const {
    resetTheme,
    theme,
    toggleTheme,
    usingSystemTheme,
  } = useColorTheme();
  const {
    dispatch,
    hydrated,
    planningMode,
    setPlanningMode,
    workspace,
  } = useProjectWorkspace();
  useLegacyBrowserCleanup();

  const [view, setView] = useState<ViewMode>("internal");
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [maximizedProjectPanel, setMaximizedProjectPanel] =
    useState<ProjectSettingsPanel | null>(null);
  const [maximizedDeliveryPanel, setMaximizedDeliveryPanel] =
    useState<DeliveryPanel | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetWorkspaceOpen, setResetWorkspaceOpen] = useState(false);
  const importRequestRef = useRef(0);
  const planningModeRef = useRef(planningMode);
  const printSessionRef = useRef<PrintSession | null>(null);

  useEffect(() => {
    planningModeRef.current = planningMode;
  }, [planningMode]);

  const project = workspace.project;
  const calculation = useScenarioCalculation(project, workspace.people);

  const changePlanningMode = useCallback((nextPlanningMode: boolean) => {
    if (nextPlanningMode === planningMode) return;

    setPlanningMode(nextPlanningMode);
    setMaximizedProjectPanel(null);
    setExportOpen(false);
    showToast(
      nextPlanningMode
        ? "Planning mode on — pricing hidden"
        : "Pricing mode on — pricing visible",
    );
  }, [planningMode, setPlanningMode, showToast]);

  const resetWorkspace = () => {
    importRequestRef.current += 1;
    printSessionRef.current?.finish(false);
    dispatch(workspaceActions.replaceWorkspace(initialWorkspace()));
    setPlanningMode(false);
    resetTheme();
    setView("internal");
    setEditingPerson(null);
    setIsNewPerson(false);
    setDragOverPhase(null);
    setMaximizedProjectPanel(null);
    setMaximizedDeliveryPanel(null);
    setExportOpen(false);
    setResetWorkspaceOpen(false);
    showToast("Preset restored — changes remain session-only");
  };

  const importProject = useCallback(async (file: File) => {
    const requestId = ++importRequestRef.current;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast("That project file is too large to import.");
      return;
    }

    try {
      const contents = await file.text();
      if (requestId !== importRequestRef.current) return;

      const normalized = normalizeWorkspace(JSON.parse(contents) as unknown);
      if (!normalized) throw new Error("Invalid workspace");
      dispatch(workspaceActions.replaceWorkspace(normalized));
      setMaximizedProjectPanel(null);
      setMaximizedDeliveryPanel(null);
      showToast(
        planningModeRef.current
          ? "Workspace imported — pricing remains hidden"
          : "Workspace imported",
      );
    } catch {
      if (requestId !== importRequestRef.current) return;
      showToast("That file is not a valid Project Planner workspace");
    }
  }, [dispatch, showToast]);

  const exportProject = () => {
    if (planningMode) {
      showToast("Turn off planning mode to export pricing data");
      return;
    }
    try {
      downloadJson(workspace, `${safeFilename(project.projectName)}.project-planner.json`);
      setExportOpen(false);
      showToast("Project file downloaded");
    } catch {
      showToast("The project file could not be downloaded");
    }
  };

  const printClientEstimate = () => {
    if (printSessionRef.current) return;

    setExportOpen(false);
    const previousView = view;
    let firstFrame = 0;
    let secondFrame = 0;
    let fallbackTimer = 0;
    let finished = false;

    const finish = (restoreView = true) => {
      if (finished) return;
      finished = true;
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener("afterprint", finishAfterPrint);
      if (printSessionRef.current?.finish === finish) printSessionRef.current = null;
      if (restoreView) setView(previousView);
    };
    const finishAfterPrint = () => finish();

    printSessionRef.current = { finish };
    window.addEventListener("afterprint", finishAfterPrint, { once: true });
    setView("client");

    firstFrame = window.requestAnimationFrame(() => {
      firstFrame = 0;
      secondFrame = window.requestAnimationFrame(() => {
        secondFrame = 0;
        try {
          window.print();
          if (!finished) {
            fallbackTimer = window.setTimeout(finishAfterPrint, PRINT_RESTORE_FALLBACK_MS);
          }
        } catch {
          finish();
          showToast("The browser could not open the print dialog");
        }
      });
    });
  };

  useEffect(() => () => {
    importRequestRef.current += 1;
    printSessionRef.current?.finish(false);
  }, []);

  const openNewPerson = useCallback(() => {
    setEditingPerson(
      makePerson({
        name: "",
        role: "",
        type: "Employee",
        department: "Delivery",
        hourlyCost: 0,
      }),
    );
    setIsNewPerson(true);
  }, []);

  const editPerson = useCallback((person: Person) => {
    setEditingPerson(person);
    setIsNewPerson(false);
  }, []);

  const patchProject = useCallback((patch: ProjectPatch) => {
    dispatch(workspaceActions.patchProject(patch));
  }, [dispatch]);

  const changeProjectName = useCallback((projectName: string) => {
    dispatch(workspaceActions.patchProject({ projectName }));
  }, [dispatch]);

  const openResetWorkspace = useCallback(() => {
    setResetWorkspaceOpen(true);
  }, []);

  const openExport = useCallback(() => {
    setExportOpen(true);
  }, []);

  const addModifier = useCallback(() => {
    dispatch(workspaceActions.addModifier(planningMode ? "planning" : "pricing"));
  }, [dispatch, planningMode]);

  const updateModifier = useCallback((modifierId: string, patch: ModifierPatch) => {
    dispatch(workspaceActions.updateModifier(modifierId, patch));
  }, [dispatch]);

  const removeModifier = useCallback((modifierId: string) => {
    dispatch(workspaceActions.removeModifier(modifierId));
  }, [dispatch]);

  const addExpense = useCallback(() => {
    dispatch(workspaceActions.addExpense());
  }, [dispatch]);

  const updateExpense = useCallback((expenseId: string, patch: ExpensePatch) => {
    dispatch(workspaceActions.updateExpense(expenseId, patch));
  }, [dispatch]);

  const removeExpense = useCallback((expenseId: string) => {
    dispatch(workspaceActions.removeExpense(expenseId));
  }, [dispatch]);

  const addPhase = useCallback(() => {
    dispatch(workspaceActions.addPhase());
  }, [dispatch]);

  const updatePhase = useCallback((phaseId: string, patch: PhasePatch) => {
    dispatch(workspaceActions.updatePhase(phaseId, patch));
  }, [dispatch]);

  const removePhase = useCallback((phaseId: string) => {
    dispatch(workspaceActions.removePhase(phaseId));
  }, [dispatch]);

  const assignPerson = useCallback((phaseId: string, personId: string) => {
    dispatch(workspaceActions.assignPerson(phaseId, personId));
  }, [dispatch]);

  const unassignPerson = useCallback((phaseId: string, personId: string) => {
    dispatch(workspaceActions.unassignPerson(phaseId, personId));
  }, [dispatch]);

  const closePersonEditor = () => {
    setEditingPerson(null);
    setIsNewPerson(false);
  };

  const savePerson = (person: Person) => {
    dispatch(workspaceActions.savePerson(person));
    closePersonEditor();
    showToast(isNewPerson ? "Person added to your pool" : "Profile updated");
  };

  const deletePerson = (personId: string) => {
    dispatch(workspaceActions.deletePerson(personId));
    closePersonEditor();
    showToast("Person removed from the workspace");
  };

  return (
    <main
      className={`app-shell ${planningMode ? "planning-mode" : "pricing-mode"}`}
      data-hydrated={hydrated}
    >
      <StableAppBackdrop />

      <StableTopbar
        projectName={project.projectName}
        planningMode={planningMode}
        theme={theme}
        usingSystemTheme={usingSystemTheme}
        view={view}
        onProjectNameChange={changeProjectName}
        onPlanningModeChange={changePlanningMode}
        onThemeToggle={toggleTheme}
        onViewChange={setView}
        onReset={openResetWorkspace}
        onImport={importProject}
        onExport={openExport}
      />

      {view === "client" ? (
        <StableClientEstimate
          project={project}
          people={workspace.people}
          calculation={calculation}
          planningMode={planningMode}
        />
      ) : (
        <>
          <StableOverviewMetrics
            project={project}
            people={workspace.people}
            calculation={calculation}
            planningMode={planningMode}
          />

          <StableProjectSettings
            project={project}
            calculation={calculation}
            planningMode={planningMode}
            maximizedPanel={maximizedProjectPanel}
            onMaximizedPanelChange={setMaximizedProjectPanel}
            onProjectChange={patchProject}
            onAddModifier={addModifier}
            onUpdateModifier={updateModifier}
            onRemoveModifier={removeModifier}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onRemoveExpense={removeExpense}
          />

          <StablePhasesStaffing
            project={project}
            people={workspace.people}
            calculation={calculation}
            planningMode={planningMode}
            maximizedPanel={maximizedDeliveryPanel}
            dragOverPhase={dragOverPhase}
            onMaximizedPanelChange={setMaximizedDeliveryPanel}
            onDragOverPhaseChange={setDragOverPhase}
            onAddPerson={openNewPerson}
            onEditPerson={editPerson}
            onAddPhase={addPhase}
            onUpdatePhase={updatePhase}
            onRemovePhase={removePhase}
            onAssignPerson={assignPerson}
            onUnassignPerson={unassignPerson}
          />

          <StableDecisionAnalytics
            project={project}
            calculation={calculation}
            planningMode={planningMode}
          />
        </>
      )}

      <PersonEditorDialog
        person={editingPerson}
        isNew={isNewPerson}
        planningMode={planningMode}
        currency={project.currency}
        onChange={setEditingPerson}
        onClose={closePersonEditor}
        onSave={savePerson}
        onDelete={deletePerson}
      />

      <ResetWorkspaceDialog
        open={resetWorkspaceOpen}
        onClose={() => setResetWorkspaceOpen(false)}
        onReset={resetWorkspace}
      />

      {exportOpen && (
        <ExportDialog
          planningMode={planningMode}
          onClose={() => setExportOpen(false)}
          onPrint={printClientEstimate}
          onDownload={exportProject}
        />
      )}

      {toast && <Toast message={toast} />}
    </main>
  );
}
