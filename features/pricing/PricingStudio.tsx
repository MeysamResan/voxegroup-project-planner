"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AppBackdrop } from "@/components/app/AppBackdrop";
import { Toast } from "@/components/ui";
import { downloadJson } from "@/lib/files/project-export";
import {
  calculateScenario,
  makePerson,
  normalizeWorkspace,
  safeFilename,
  workspaceActions,
  type DeliveryPanel,
  type Person,
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
  RevealPricingDialog,
  Topbar,
} from "./components";
import { useOfflineSupport, usePricingWorkspace, useToast } from "./hooks";

const MAX_IMPORT_BYTES = 5_000_000;
const PRINT_RESTORE_FALLBACK_MS = 1_000;

type PrintSession = {
  finish: (restoreView?: boolean) => void;
};

export function PricingStudio() {
  const { message: toast, showToast } = useToast();
  const {
    dispatch,
    hydrated,
    planningMode,
    setPlanningMode,
    workspace,
  } = usePricingWorkspace({
    onPersistenceError: () => {
      showToast("Browser storage is unavailable; changes will last for this session only.");
    },
  });
  useOfflineSupport();

  const [view, setView] = useState<ViewMode>("internal");
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [maximizedProjectPanel, setMaximizedProjectPanel] =
    useState<ProjectSettingsPanel | null>(null);
  const [maximizedDeliveryPanel, setMaximizedDeliveryPanel] =
    useState<DeliveryPanel | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [revealPricingOpen, setRevealPricingOpen] = useState(false);
  const importRequestRef = useRef(0);
  const planningModeRef = useRef(planningMode);
  const printSessionRef = useRef<PrintSession | null>(null);

  useEffect(() => {
    planningModeRef.current = planningMode;
  }, [planningMode]);

  const project = workspace.project;
  const calculation = useMemo(
    () => calculateScenario(project, workspace.people),
    [project, workspace.people],
  );

  const togglePlanningMode = () => {
    if (planningMode) {
      setExportOpen(false);
      setRevealPricingOpen(true);
      return;
    }

    setPlanningMode(true);
    setMaximizedProjectPanel(null);
    setExportOpen(false);
    showToast("Planning mode on — pricing hidden");
  };

  const revealPricing = () => {
    setPlanningMode(false);
    setMaximizedProjectPanel(null);
    setRevealPricingOpen(false);
    showToast("Planning mode off — pricing restored");
  };

  const importProject = async (file: File) => {
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
      showToast("That file is not a valid Voxe workspace");
    }
  };

  const exportProject = () => {
    if (planningMode) {
      showToast("Turn off planning mode to export pricing data");
      return;
    }
    try {
      downloadJson(workspace, `${safeFilename(project.projectName)}.voxe.json`);
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

  const openNewPerson = () => {
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
  };

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
      <AppBackdrop />

      <Topbar
        projectName={project.projectName}
        planningMode={planningMode}
        view={view}
        onProjectNameChange={(projectName) =>
          dispatch(workspaceActions.patchProject({ projectName }))
        }
        onTogglePlanningMode={togglePlanningMode}
        onViewChange={setView}
        onImport={importProject}
        onExport={() => setExportOpen(true)}
      />

      {view === "client" ? (
        <ClientEstimate
          project={project}
          people={workspace.people}
          calculation={calculation}
          planningMode={planningMode}
        />
      ) : (
        <>
          <OverviewMetrics
            project={project}
            people={workspace.people}
            calculation={calculation}
            planningMode={planningMode}
          />

          <ProjectSettings
            project={project}
            calculation={calculation}
            planningMode={planningMode}
            maximizedPanel={maximizedProjectPanel}
            onMaximizedPanelChange={setMaximizedProjectPanel}
            onProjectChange={(patch) => dispatch(workspaceActions.patchProject(patch))}
            onAddModifier={() =>
              dispatch(workspaceActions.addModifier(planningMode ? "planning" : "pricing"))
            }
            onUpdateModifier={(modifierId, patch) =>
              dispatch(workspaceActions.updateModifier(modifierId, patch))
            }
            onRemoveModifier={(modifierId) =>
              dispatch(workspaceActions.removeModifier(modifierId))
            }
            onAddExpense={() => dispatch(workspaceActions.addExpense())}
            onUpdateExpense={(expenseId, patch) =>
              dispatch(workspaceActions.updateExpense(expenseId, patch))
            }
            onRemoveExpense={(expenseId) =>
              dispatch(workspaceActions.removeExpense(expenseId))
            }
          />

          <PhasesStaffing
            project={project}
            people={workspace.people}
            calculation={calculation}
            planningMode={planningMode}
            maximizedPanel={maximizedDeliveryPanel}
            dragOverPhase={dragOverPhase}
            onMaximizedPanelChange={setMaximizedDeliveryPanel}
            onDragOverPhaseChange={setDragOverPhase}
            onAddPerson={openNewPerson}
            onEditPerson={(person) => {
              setEditingPerson(person);
              setIsNewPerson(false);
            }}
            onAddPhase={() => dispatch(workspaceActions.addPhase())}
            onUpdatePhase={(phaseId, patch) =>
              dispatch(workspaceActions.updatePhase(phaseId, patch))
            }
            onRemovePhase={(phaseId) => dispatch(workspaceActions.removePhase(phaseId))}
            onAssignPerson={(phaseId, personId) =>
              dispatch(workspaceActions.assignPerson(phaseId, personId))
            }
            onUnassignPerson={(phaseId, personId) =>
              dispatch(workspaceActions.unassignPerson(phaseId, personId))
            }
          />

          <DecisionAnalytics
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

      <RevealPricingDialog
        open={revealPricingOpen}
        onClose={() => setRevealPricingOpen(false)}
        onReveal={revealPricing}
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
