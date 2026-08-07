"use client";

import type { CSSProperties, DragEvent } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  GripVertical,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  EmptyState,
  IconButton,
  NumberStepper,
  PanelHeader,
  PanelSizeButton,
  SectionCard,
  SummaryCard,
  SummaryGrid,
  TextInput,
  runPanelViewTransition,
} from "@/components/ui";
import {
  currencyFormat,
  initials,
  longDate,
  personTypeClass,
} from "@/lib/pricing/formatters.ts";
import { selectAssignedPeopleCount } from "@/lib/pricing/selectors.ts";
import type {
  DeliveryPanel,
  Person,
  Phase,
  ProjectPlan,
  ScenarioCalculation,
} from "@/lib/pricing/types.ts";

const PERSON_DRAG_TYPE = "application/x-voxe-person";

export type PhasePatch = Partial<Omit<Phase, "id" | "assignments">>;

export interface PeopleSidebarProps {
  people: Person[];
  maximized: boolean;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onToggleMaximized: () => void;
  onPersonDragEnd: () => void;
}

export function PeopleSidebar({
  people,
  maximized,
  onAddPerson,
  onEditPerson,
  onToggleMaximized,
  onPersonDragEnd,
}: PeopleSidebarProps) {
  return (
    <aside className="people-sidebar" aria-label="People sidebar">
      <PanelHeader
        className="people-workspace-heading"
        title="People"
        icon={<Users size={18} />}
        iconTone="people"
        actions={(
          <>
            <IconButton variant="accent" label="Add person" onClick={onAddPerson}>
              <Plus size={17} aria-hidden="true" />
            </IconButton>
            <PanelSizeButton
              label="People"
              maximized={maximized}
              onToggle={onToggleMaximized}
            />
          </>
        )}
      />

      <p className="dock-hint">
        {maximized
          ? "Click a profile to edit its planning and team details."
          : "Drag a person into a phase, or click a profile to edit it."}
      </p>

      <div className="people-list">
        {people.map((person) => (
          <button
            type="button"
            key={person.id}
            className={`person-card ${personTypeClass(person.type)}`}
            style={{ "--person-color": person.color } as CSSProperties}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(PERSON_DRAG_TYPE, person.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={onPersonDragEnd}
            onClick={() => onEditPerson(person)}
          >
            <span className="person-card-avatar">{initials(person.name)}</span>
            <span className="person-card-copy">
              <strong>{person.name}</strong>
              <small>{person.role}</small>
              <em>{person.type}</em>
            </span>
            <GripVertical size={17} />
          </button>
        ))}
      </div>

      <div className="dock-footer">
        <Users size={17} />
        <span>{people.length} people available</span>
      </div>
    </aside>
  );
}

export interface PhaseTotalsProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
}

export function PhaseTotals({
  project,
  people,
  calculation,
  planningMode,
}: PhaseTotalsProps) {
  const assignedPeopleCount = selectAssignedPeopleCount(project, people);

  return (
    <SummaryGrid
      className={`phase-totals-summary ${
        planningMode ? "planning-phase-totals" : "pricing-phase-totals"
      }`}
      ariaLabel="Phase totals"
    >
      <SummaryCard
        flat
        className="phase-total-item phase-total-duration"
        labelClassName="phase-total-label"
        valueClassName="phase-total-value"
        detailClassName="phase-total-detail"
        label="Project duration"
        value={`${calculation.totalWorkingDays} workdays`}
        detail={`${calculation.calendarDays} calendar days`}
      />
      <SummaryCard
        flat
        className="phase-total-item phase-total-hours"
        labelClassName="phase-total-label"
        valueClassName="phase-total-value"
        detailClassName="phase-total-detail"
        label="Total hours"
        value={`${Math.round(calculation.totalHours)}h`}
        detail="Scheduled delivery effort"
      />
      <SummaryCard
        flat
        className="phase-total-item phase-total-phases"
        labelClassName="phase-total-label"
        valueClassName="phase-total-value"
        detailClassName="phase-total-detail"
        label="Phases"
        value={project.phases.length}
        detail={project.phases.length === 1 ? "Delivery phase" : "Delivery phases"}
      />
      <SummaryCard
        flat
        className="phase-total-item phase-total-people"
        labelClassName="phase-total-label"
        valueClassName="phase-total-value"
        detailClassName="phase-total-detail"
        label="Assigned people"
        value={assignedPeopleCount}
        detail="Unique team members"
      />
      {!planningMode && (
        <>
          <SummaryCard
            flat
            className="phase-total-item phase-total-labor"
            labelClassName="phase-total-label"
            valueClassName="phase-total-value"
            detailClassName="phase-total-detail"
            label="Labor cost"
            value={currencyFormat(project.currency, calculation.laborCost)}
            detail="Calculated staffing cost"
          />
          <SummaryCard
            flat
            className="phase-total-item phase-total-price"
            labelClassName="phase-total-label"
            valueClassName="phase-total-value"
            detailClassName="phase-total-detail"
            label="Total project price"
            value={currencyFormat(project.currency, calculation.quote)}
            detail="Final quote including commercial adjustments"
          />
        </>
      )}
    </SummaryGrid>
  );
}

export interface PhasesPanelProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
  maximized: boolean;
  dragOverPhase: string | null;
  onAddPhase: () => void;
  onUpdatePhase: (phaseId: string, patch: PhasePatch) => void;
  onRemovePhase: (phaseId: string) => void;
  onAssignPerson: (phaseId: string, personId: string) => void;
  onUnassignPerson: (phaseId: string, personId: string) => void;
  onDragOverPhaseChange: (phaseId: string | null) => void;
  onToggleMaximized: () => void;
}

export function PhasesPanel({
  project,
  people,
  calculation,
  planningMode,
  maximized,
  dragOverPhase,
  onAddPhase,
  onUpdatePhase,
  onRemovePhase,
  onAssignPerson,
  onUnassignPerson,
  onDragOverPhaseChange,
  onToggleMaximized,
}: PhasesPanelProps) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const phaseResultsById = new Map(
    calculation.phaseResults.map((result) => [result.id, result]),
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>, phaseId: string) => {
    event.preventDefault();
    const personId = event.dataTransfer.getData(PERSON_DRAG_TYPE);
    if (personId) onAssignPerson(phaseId, personId);
    onDragOverPhaseChange(null);
  };

  return (
    <section className="phase-workspace" aria-labelledby="phases-panel-title">
      <PanelHeader
        className="phase-workspace-heading"
        title="Phases"
        titleId="phases-panel-title"
        subtitle="Workdays, staffing and delivery effort"
        icon={<BriefcaseBusiness size={18} />}
        iconTone="schedule"
        actions={(
          <>
            <IconButton variant="accent" label="Add phase" onClick={onAddPhase}>
              <Plus size={17} aria-hidden="true" />
            </IconButton>
            <PanelSizeButton
              label="Phases"
              maximized={maximized}
              onToggle={onToggleMaximized}
            />
          </>
        )}
      />

      <div className={`phase-table ${planningMode ? "planning-phase-table" : ""}`}>
        <div className="phase-table-head">
          <span>Phase</span>
          <span>Workdays</span>
          <span>Assigned people</span>
          <span className="phase-number-heading">Hours</span>
          {!planningMode && <span className="phase-number-heading">Cost</span>}
          <span className="phase-action-heading">Actions</span>
        </div>

        {project.phases.map((phase, index) => {
          const result = phaseResultsById.get(phase.id);

          return (
            <div
              className={`phase-row ${dragOverPhase === phase.id ? "drop-active" : ""}`}
              key={phase.id}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOverPhaseChange(phase.id);
              }}
              onDragLeave={() => onDragOverPhaseChange(null)}
              onDrop={(event) => handleDrop(event, phase.id)}
            >
              <div className="phase-name-block">
                <div className="phase-name-cell">
                  <b aria-hidden="true">{String(index + 1).padStart(2, "0")}</b>
                  <TextInput
                    aria-label={`Phase ${index + 1} name`}
                    value={phase.name}
                    onChange={(event) => onUpdatePhase(phase.id, { name: event.target.value })}
                  />
                </div>
                <div
                  className="phase-date"
                  title={`${longDate(result?.start ?? "")} to ${longDate(result?.end ?? "")}`}
                >
                  <CalendarDays size={13} aria-hidden="true" />
                  <span className="phase-date-context">Phase dates: </span>
                  <time dateTime={result?.start || undefined}>
                    {longDate(result?.start ?? "")}
                  </time>
                  <span aria-hidden="true">→</span>
                  <span className="phase-date-context"> to </span>
                  <time dateTime={result?.end || undefined}>
                    {longDate(result?.end ?? "")}
                  </time>
                </div>
              </div>

              <NumberStepper
                ariaLabel={`${phase.name} workdays`}
                value={phase.days}
                min={0}
                step={1}
                suffix="days"
                onChange={(days) => onUpdatePhase(phase.id, { days })}
              />

              <div
                className="assignment-zone"
                role="group"
                aria-label={`Assigned people for ${phase.name}. Drag people here.`}
              >
                {phase.assignments.map((assignment) => {
                  const person = peopleById.get(assignment.personId);
                  if (!person) return null;

                  return (
                    <div
                      className="assignment-pill"
                      key={person.id}
                      title={`${person.name} • ${person.role}`}
                    >
                      <i aria-hidden="true" style={{ background: person.color }}>
                        {initials(person.name)}
                      </i>
                      <span className="assignment-person-name">{person.name}</span>
                      <button
                        type="button"
                        title={`Remove ${person.name}`}
                        aria-label={`Remove ${person.name}`}
                        onClick={() => onUnassignPerson(phase.id, person.id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                {!phase.assignments.length && <small>Drag people here</small>}
              </div>

              <strong className="phase-number phase-hours-value">
                {Math.round(result?.adjustedHours ?? 0)}h
              </strong>
              {!planningMode && (
                <strong className="phase-number phase-cost-value">
                  {currencyFormat(project.currency, result?.laborCost ?? 0)}
                </strong>
              )}
              <IconButton
                variant="danger"
                className="phase-action-button"
                label={`Remove ${phase.name}`}
                onClick={() => onRemovePhase(phase.id)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </IconButton>
            </div>
          );
        })}

        {!project.phases.length && (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="No delivery phases yet"
            description="Add the first phase to begin the estimate."
          />
        )}
      </div>

      <PhaseTotals
        project={project}
        people={people}
        calculation={calculation}
        planningMode={planningMode}
      />
    </section>
  );
}

export interface PhasesStaffingProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
  maximizedPanel: DeliveryPanel | null;
  dragOverPhase: string | null;
  onMaximizedPanelChange: (panel: DeliveryPanel | null) => void;
  onDragOverPhaseChange: (phaseId: string | null) => void;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onAddPhase: () => void;
  onUpdatePhase: (phaseId: string, patch: PhasePatch) => void;
  onRemovePhase: (phaseId: string) => void;
  onAssignPerson: (phaseId: string, personId: string) => void;
  onUnassignPerson: (phaseId: string, personId: string) => void;
}

export function PhasesStaffing({
  project,
  people,
  calculation,
  planningMode,
  maximizedPanel,
  dragOverPhase,
  onMaximizedPanelChange,
  onDragOverPhaseChange,
  onAddPerson,
  onEditPerson,
  onAddPhase,
  onUpdatePhase,
  onRemovePhase,
  onAssignPerson,
  onUnassignPerson,
}: PhasesStaffingProps) {
  const showPeoplePanel = maximizedPanel === null || maximizedPanel === "people";
  const showPhasesPanel = maximizedPanel === null || maximizedPanel === "phases";

  const togglePanel = (panel: DeliveryPanel) => {
    runPanelViewTransition(() => {
      onMaximizedPanelChange(maximizedPanel === panel ? null : panel);
      onDragOverPhaseChange(null);
    });
  };

  return (
    <SectionCard
      className={`phases-card${maximizedPanel ? " has-maximized-panel" : ""}`}
      title="Phases & staffing"
      titleId="phases-staffing-title"
    >
      <div className={`delivery-workspace${maximizedPanel ? " is-single" : ""}`}>
        {showPeoplePanel && (
          <PeopleSidebar
            people={people}
            maximized={maximizedPanel === "people"}
            onAddPerson={onAddPerson}
            onEditPerson={onEditPerson}
            onToggleMaximized={() => togglePanel("people")}
            onPersonDragEnd={() => onDragOverPhaseChange(null)}
          />
        )}

        {showPhasesPanel && (
          <PhasesPanel
            project={project}
            people={people}
            calculation={calculation}
            planningMode={planningMode}
            maximized={maximizedPanel === "phases"}
            dragOverPhase={dragOverPhase}
            onAddPhase={onAddPhase}
            onUpdatePhase={onUpdatePhase}
            onRemovePhase={onRemovePhase}
            onAssignPerson={onAssignPerson}
            onUnassignPerson={onUnassignPerson}
            onDragOverPhaseChange={onDragOverPhaseChange}
            onToggleMaximized={() => togglePanel("phases")}
          />
        )}
      </div>
    </SectionCard>
  );
}
