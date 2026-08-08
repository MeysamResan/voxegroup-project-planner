"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LockKeyhole,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  AiNoteButton,
  AiNoteEditor,
  Button,
  EmptyState,
  IconButton,
  NumberStepper,
  PanelHeader,
  PanelSizeButton,
  SectionCard,
  TextInput,
  runPanelViewTransition,
} from "@/components/ui";
import {
  currencyFormat,
  friendlyDate,
  initials,
  longDate,
  personTypeClass,
} from "@/lib/pricing/formatters.ts";
import { PHASE_TONES } from "@/lib/pricing/constants.ts";
import { selectAssignedPeopleCount } from "@/lib/pricing/selectors.ts";
import type {
  Currency,
  DeliveryPanel,
  Person,
  Phase,
  PhaseTask,
  ProjectPlan,
  ScenarioCalculation,
} from "@/lib/pricing/types.ts";

const PERSON_DRAG_TYPE = "application/x-voxe-person";
const ASSIGNMENT_REMOVE_ANIMATION_MS = 220;

const PHASE_TONE_STYLES = PHASE_TONES.map((tone) => ({
    "--phase-color-light": tone.light,
    "--phase-color-dark": tone.dark,
  }) as CSSProperties);

const phaseToneStyle = (index: number): CSSProperties =>
  PHASE_TONE_STYLES[index % PHASE_TONE_STYLES.length] ?? PHASE_TONE_STYLES[0];

type TaskAssignmentContext = {
  phaseId: string;
  taskId: string | null;
};

type AssignmentDragSource = TaskAssignmentContext & {
  personId: string;
};

type PersonDragPayload = {
  personId: string;
  source: TaskAssignmentContext | null;
};

const writePersonDragPayload = (
  event: DragEvent<HTMLElement>,
  personId: string,
  source: TaskAssignmentContext | null = null,
) => {
  const payload: PersonDragPayload = { personId, source };
  event.dataTransfer.setData(PERSON_DRAG_TYPE, JSON.stringify(payload));
};

const readPersonDragPayload = (event: DragEvent<HTMLElement>): PersonDragPayload | null => {
  const rawPayload = event.dataTransfer.getData(PERSON_DRAG_TYPE);
  if (!rawPayload) return null;

  try {
    const payload = JSON.parse(rawPayload) as Partial<PersonDragPayload>;
    if (typeof payload.personId !== "string" || !payload.personId) return null;
    const source = payload.source;
    if (
      source !== null
      && source !== undefined
      && (
        typeof source !== "object"
        || typeof source.phaseId !== "string"
        || !(typeof source.taskId === "string" || source.taskId === null)
      )
    ) {
      return null;
    }
    return { personId: payload.personId, source: source ?? null };
  } catch {
    // Workspaces created before assignment moves stored a plain person id.
    return { personId: rawPayload, source: null };
  }
};

interface AssignmentAvatarProps {
  currency: Currency;
  isDragging: boolean;
  isRemoving: boolean;
  person: Person;
  planningMode: boolean;
  scopeLabel: string;
  source: TaskAssignmentContext;
  onDragEnd: (source: AssignmentDragSource) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, source: AssignmentDragSource) => void;
}

function AssignmentAvatar({
  currency,
  isDragging,
  isRemoving,
  onDragEnd,
  onDragStart,
  person,
  planningMode,
  scopeLabel,
  source,
}: AssignmentAvatarProps) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const positionFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const popoverId = useId();

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 8;
    const width = Math.min(320, window.innerWidth - viewportPadding * 2);
    const estimatedHeight = Math.min(360, window.innerHeight - viewportPadding * 2);
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const top = availableBelow >= estimatedHeight
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - estimatedHeight - gap);
    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.left + rect.width / 2 - width / 2,
        window.innerWidth - width - viewportPadding,
      ),
    );

    setPopoverStyle({
      left,
      top,
      width,
      maxHeight: window.innerHeight - viewportPadding * 2,
    });
  }, []);

  const schedulePopoverPosition = useCallback(() => {
    if (positionFrameRef.current !== null) return;
    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      positionPopover();
    });
  }, [positionPopover]);

  const closePopover = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    positionPopover();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target)
        && !popoverRef.current?.contains(target)
      ) {
        closePopover();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closePopover();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", schedulePopoverPosition);
    window.addEventListener("scroll", schedulePopoverPosition, true);
    return () => {
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", schedulePopoverPosition);
      window.removeEventListener("scroll", schedulePopoverPosition, true);
    };
  }, [closePopover, open, positionPopover, schedulePopoverPosition]);

  const details = [
    ["Department", person.department],
    ["Email", person.email],
    ["Phone", person.phone],
    ["Location", person.location],
    ["Skills", person.skills],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));

  const popover = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id={popoverId}
          ref={popoverRef}
          className="assignment-person-popover"
          role="dialog"
          aria-label={`${person.name} information`}
          style={popoverStyle}
        >
          <div className="assignment-person-popover-head">
            <span
              className="assignment-person-popover-avatar"
              style={{ "--person-color": person.color } as CSSProperties}
              aria-hidden="true"
            >
              {initials(person.name)}
            </span>
            <div>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
              <small>{person.type}</small>
            </div>
          </div>

          {(details.length > 0 || !planningMode) && (
            <dl className="assignment-person-details">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {!planningMode && (
                <div>
                  <dt>Hourly cost</dt>
                  <dd>{currencyFormat(currency, person.hourlyCost)}</dd>
                </div>
              )}
            </dl>
          )}

          {person.notes && (
            <p className="assignment-person-notes">{person.notes}</p>
          )}
        </div>,
        document.body,
      )
    : null;

  const dragSource: AssignmentDragSource = { ...source, personId: person.id };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`assignment-avatar${isDragging ? " is-dragging" : ""}${
          isRemoving ? " is-removing" : ""
        }`}
        style={{ "--person-color": person.color } as CSSProperties}
        draggable
        aria-label={`${person.name}, ${person.role}. Click for information or drag to move from ${scopeLabel}.`}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        aria-expanded={open}
        title={`${person.name} • ${person.role}`}
        onClick={() => {
          if (suppressClickRef.current) return;
          positionPopover();
          setOpen((current) => !current);
        }}
        onBlur={() => window.requestAnimationFrame(() => {
          const activeElement = document.activeElement;
          if (!popoverRef.current?.contains(activeElement)) closePopover();
        })}
        onDragStart={(event) => {
          suppressClickRef.current = true;
          closePopover();
          onDragStart(event, dragSource);
        }}
        onDragEnd={() => {
          onDragEnd(dragSource);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
      >
        <span aria-hidden="true">{initials(person.name)}</span>
      </button>
      {popover}
    </>
  );
}

export type PhasePatch = Partial<Omit<Phase, "id" | "assignments" | "tasks">>;
export type PhaseTaskPatch = Partial<Omit<PhaseTask, "id" | "assignments">>;

export interface PeopleSidebarProps {
  compact: boolean;
  people: Person[];
  maximized: boolean;
  taskPhase: Phase | null;
  task: PhaseTask | null;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onToggleMaximized: () => void;
  onPersonDragEnd: () => void;
}

export function PeopleSidebar({
  compact,
  people,
  maximized,
  taskPhase,
  task,
  onAddPerson,
  onEditPerson,
  onToggleMaximized,
  onPersonDragEnd,
}: PeopleSidebarProps) {
  const [railExpanded, setRailExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const railToggleRef = useRef<HTMLButtonElement>(null);
  const taskPhasePersonIds = useMemo(
    () => new Set(taskPhase?.assignments.map(({ personId }) => personId) ?? []),
    [taskPhase],
  );
  const taskPersonIds = useMemo(
    () => new Set(task?.assignments.map(({ personId }) => personId) ?? []),
    [task],
  );

  useEffect(() => {
    if (!compact || !railExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setRailExpanded(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setRailExpanded(false);
      railToggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [compact, railExpanded]);

  return (
    <aside
      ref={sidebarRef}
      className={`people-sidebar${compact ? " is-compact" : ""}${
        compact && railExpanded ? " is-rail-expanded" : ""
      }`}
      aria-label="People sidebar"
    >
      <PanelHeader
        className="people-workspace-heading"
        title="People"
        icon={<Users size={18} />}
        iconTone="people"
        actions={(
          <>
            {compact && (
              <IconButton
                ref={railToggleRef}
                className="people-rail-toggle"
                label={railExpanded ? "Collapse people sidebar" : "Expand people sidebar"}
                aria-expanded={railExpanded}
                onClick={() => setRailExpanded((current) => !current)}
              >
                {railExpanded
                  ? <ChevronLeft size={17} aria-hidden="true" />
                  : <ChevronRight size={17} aria-hidden="true" />}
              </IconButton>
            )}
            <IconButton variant="accent" label="Add person" onClick={onAddPerson}>
              <Plus size={17} aria-hidden="true" />
            </IconButton>
            <PanelSizeButton
              className="people-panel-size-button"
              label="People"
              maximized={maximized}
              onToggle={onToggleMaximized}
            />
          </>
        )}
      />

      <p className="dock-hint">
        {taskPhase
          ? task
            ? <>Drag an eligible person into <strong>{task.name || "this sub-phase"}</strong>.</>
            : <>Choose a sub-phase in <strong>{taskPhase.name}</strong> to assign people.</>
          : maximized
          ? "Click a profile to edit its planning and team details."
          : "Drag a person into a phase, or click a profile to edit it."}
      </p>

      <div className="people-list">
        {people.map((person) => {
          const isInTaskPhase = taskPhasePersonIds.has(person.id);
          const isAssignedToTask = taskPersonIds.has(person.id);
          const taskStateClass = !taskPhase
            ? ""
            : isAssignedToTask
              ? " is-task-assigned"
              : isInTaskPhase
                ? " is-task-eligible"
                : " is-task-unavailable";
          const taskStateLabel = isAssignedToTask
            ? "Assigned to this sub-phase"
            : isInTaskPhase
              ? "Available for this sub-phase"
              : `Not assigned to ${taskPhase?.name}`;

          return (
            <button
              type="button"
              key={person.id}
              className={`person-card ${personTypeClass(person.type)}${taskStateClass}`}
              style={{ "--person-color": person.color } as CSSProperties}
              draggable
              aria-label={`${person.name}, ${person.role}. Click to edit or drag to assign.`}
              title={`${person.name} • ${person.role}`}
              onDragStart={(event) => {
                writePersonDragPayload(event, person.id);
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
              {taskPhase ? (
                <span
                  className="person-task-state"
                  aria-label={taskStateLabel}
                  title={taskStateLabel}
                >
                  {isAssignedToTask
                    ? <Check size={15} aria-hidden="true" />
                    : isInTaskPhase
                      ? <GripVertical size={15} aria-hidden="true" />
                      : <LockKeyhole size={14} aria-hidden="true" />}
                </span>
              ) : (
                <GripVertical size={17} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <div className="dock-footer">
        <Users size={17} />
        <span>
          {taskPhase
            ? `${taskPhase.assignments.length} eligible people`
            : `${people.length} people available`}
        </span>
      </div>
    </aside>
  );
}

export interface PhaseTotalsProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
  onPhaseSelect: (phaseId: string) => void;
}

export function PhaseTotals({
  project,
  people,
  calculation,
  planningMode,
  onPhaseSelect,
}: PhaseTotalsProps) {
  const assignedPeopleCount = selectAssignedPeopleCount(project, people);
  const phaseDurationTotal = project.phases.reduce(
    (total, phase) => total + Math.max(0, phase.days),
    0,
  );

  return (
    <section
      className={`phase-overview ${
        planningMode ? "planning-phase-overview" : "pricing-phase-overview"
      }`}
      aria-label="Delivery overview"
    >
      <div className="phase-overview-visual">
        <div className="phase-overview-heading">
          <div className="phase-overview-title">
            <span className="phase-overview-title-icon" aria-hidden="true">
              <CalendarDays size={17} />
            </span>
            <div>
              <h3>Delivery mix</h3>
              <p>
                {project.phases.length} phases
                <span aria-hidden="true"> · </span>
                {Math.round(calculation.totalHours)}h planned
              </p>
            </div>
          </div>

          <div
            className="phase-overview-duration"
            aria-label={`${calculation.totalWorkingDays} working days and ${calculation.calendarDays} calendar days`}
          >
            <span>
              <strong>{calculation.totalWorkingDays}</strong>
              <small>working days</small>
            </span>
            <span className="phase-overview-duration-divider" aria-hidden="true" />
            <span>
              <strong>{calculation.calendarDays}</strong>
              <small>calendar days</small>
            </span>
          </div>
        </div>

        <div
          className="phase-overview-track"
          role="group"
          aria-label="Phase duration distribution"
        >
          {project.phases.map((phase, index) => {
            const durationShare = phaseDurationTotal > 0
              ? Math.round((Math.max(0, phase.days) / phaseDurationTotal) * 100)
              : 0;
            const phaseLabel = `${phase.name}: ${phase.days} workdays${
              phaseDurationTotal > 0 ? `, ${durationShare}% of delivery` : ""
            }`;

            return (
              <button
                type="button"
                className={`phase-overview-segment phase-tone-${
                  (index % PHASE_TONES.length) + 1
                }`}
                key={phase.id}
                aria-label={`${phaseLabel}. View phase ${index + 1}.`}
                title={`${phaseLabel} - view phase`}
                style={{
                  ...phaseToneStyle(index),
                  flexGrow: Math.max(phase.days, 0.25),
                }}
                onClick={() => onPhaseSelect(phase.id)}
              />
            );
          })}
          {!project.phases.length && (
            <span className="phase-overview-track-empty">No phases</span>
          )}
        </div>

        <div
          className="phase-overview-range"
          role="group"
          aria-label={`Project dates: ${longDate(calculation.projectStart)} to ${longDate(
            calculation.projectEnd,
          )}`}
        >
          <span>
            <small>Start</small>
            <time dateTime={calculation.projectStart || undefined}>
              {longDate(calculation.projectStart)}
            </time>
          </span>
          <small className="phase-overview-range-hint" aria-hidden="true">
            Select a phase to view
          </small>
          <span>
            <small>End</small>
            <time dateTime={calculation.projectEnd || undefined}>
              {longDate(calculation.projectEnd)}
            </time>
          </span>
        </div>
      </div>

      <dl className="phase-overview-metrics">
        <div
          className="phase-overview-metric"
          title={`${assignedPeopleCount} unique assigned team members`}
        >
          <dt>Team</dt>
          <dd>{assignedPeopleCount}</dd>
        </div>
        {!planningMode && (
          <>
            <div className="phase-overview-metric" title="Calculated labor cost">
              <dt>Labor cost</dt>
              <dd>{currencyFormat(project.currency, calculation.laborCost)}</dd>
            </div>
            <div
              className="phase-overview-metric phase-overview-quote"
              title="Final quote including commercial adjustments"
            >
              <dt>Quote</dt>
              <dd>{currencyFormat(project.currency, calculation.quote)}</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
}

const MemoizedPhaseTotals = memo(PhaseTotals);

export interface PhasesPanelProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
  maximized: boolean;
  dragOverPhase: string | null;
  taskAssignmentContext: TaskAssignmentContext | null;
  onAddPhase: () => void;
  onUpdatePhase: (phaseId: string, patch: PhasePatch) => void;
  onRemovePhase: (phaseId: string) => void;
  onAssignPerson: (phaseId: string, personId: string) => void;
  onUnassignPerson: (phaseId: string, personId: string) => void;
  onAddPhaseTask: (phaseId: string) => void;
  onUpdatePhaseTask: (phaseId: string, taskId: string, patch: PhaseTaskPatch) => void;
  onRemovePhaseTask: (phaseId: string, taskId: string) => void;
  onAssignPhaseTaskPerson: (phaseId: string, taskId: string, personId: string) => void;
  onUnassignPhaseTaskPerson: (phaseId: string, taskId: string, personId: string) => void;
  onTaskAssignmentContextChange: (context: TaskAssignmentContext | null) => void;
  onTaskAssignmentRejected: (phaseName: string) => void;
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
  taskAssignmentContext,
  onAddPhase,
  onUpdatePhase,
  onRemovePhase,
  onAssignPerson,
  onUnassignPerson,
  onAddPhaseTask,
  onUpdatePhaseTask,
  onRemovePhaseTask,
  onAssignPhaseTaskPerson,
  onUnassignPhaseTaskPerson,
  onTaskAssignmentContextChange,
  onTaskAssignmentRejected,
  onDragOverPhaseChange,
  onToggleMaximized,
}: PhasesPanelProps) {
  const notesIdPrefix = useId().replace(/:/g, "");
  const [expandedTaskPhases, setExpandedTaskPhases] = useState<Set<string>>(
    () => new Set(),
  );
  const [openNotesKey, setOpenNotesKey] = useState<string | null>(null);
  const [dragOverTask, setDragOverTask] = useState<string | null>(null);
  const [activeAssignmentDrag, setActiveAssignmentDrag] =
    useState<AssignmentDragSource | null>(null);
  const [assignmentDropTarget, setAssignmentDropTarget] =
    useState<TaskAssignmentContext | null>(null);
  const [assignmentRemovalActive, setAssignmentRemovalActive] = useState(false);
  const [overviewTargetPhaseId, setOverviewTargetPhaseId] = useState<string | null>(null);
  const [assignmentDragOrigin, setAssignmentDragOrigin] = useState({ x: 0, y: 0 });
  const assignmentDropHandledRef = useRef(false);
  const assignmentDropTargetRef = useRef<TaskAssignmentContext | null>(null);
  const assignmentDragPreviewRef = useRef<HTMLDivElement>(null);
  const assignmentDragPositionRef = useRef({ x: 0, y: 0 });
  const assignmentDragFrameRef = useRef<number | null>(null);
  const assignmentRemovalTimerRef = useRef<number | null>(null);
  const phaseNavigationTimerRef = useRef<number | null>(null);
  const selectedTaskRowRef = useRef<HTMLDivElement>(null);
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const phaseResultsById = useMemo(
    () => new Map(calculation.phaseResults.map((result) => [result.id, result])),
    [calculation.phaseResults],
  );
  const taskResultsByPhaseId = useMemo(
    () => new Map(calculation.phaseResults.map((result) => [
      result.id,
      new Map(result.taskResults.map((taskResult) => [taskResult.id, taskResult])),
    ])),
    [calculation.phaseResults],
  );

  const updateAssignmentDropTarget = useCallback((target: TaskAssignmentContext | null) => {
    const currentTarget = assignmentDropTargetRef.current;
    if (
      currentTarget?.phaseId === target?.phaseId
      && currentTarget?.taskId === target?.taskId
    ) {
      return;
    }
    assignmentDropTargetRef.current = target;
    setAssignmentDropTarget(target);
  }, []);

  const positionAssignmentDragPreview = useCallback((x: number, y: number) => {
    assignmentDragPositionRef.current.x = x;
    assignmentDragPositionRef.current.y = y;
    if (assignmentDragFrameRef.current !== null) return;
    assignmentDragFrameRef.current = window.requestAnimationFrame(() => {
      assignmentDragFrameRef.current = null;
      if (!assignmentDragPreviewRef.current) return;
      const position = assignmentDragPositionRef.current;
      assignmentDragPreviewRef.current.style.transform =
        `translate3d(${Math.round(position.x - 21)}px, ${Math.round(position.y - 21)}px, 0)`;
    });
  }, []);

  const cancelAssignmentRemoval = useCallback(() => {
    if (assignmentRemovalTimerRef.current === null) return;
    window.clearTimeout(assignmentRemovalTimerRef.current);
    assignmentRemovalTimerRef.current = null;
  }, []);

  const clearAssignmentDragUi = useCallback(() => {
    setAssignmentRemovalActive(false);
    setActiveAssignmentDrag(null);
    updateAssignmentDropTarget(null);
    setDragOverTask(null);
    onDragOverPhaseChange(null);
  }, [onDragOverPhaseChange, updateAssignmentDropTarget]);

  useEffect(() => () => {
    cancelAssignmentRemoval();
    if (assignmentDragFrameRef.current !== null) {
      window.cancelAnimationFrame(assignmentDragFrameRef.current);
    }
  }, [cancelAssignmentRemoval]);

  useEffect(() => () => {
    if (phaseNavigationTimerRef.current !== null) {
      window.clearTimeout(phaseNavigationTimerRef.current);
    }
  }, []);

  const navigateToPhase = useCallback((phaseId: string) => {
    const phaseRow = document.getElementById(`phase-row-${phaseId}`);
    if (!phaseRow) return;

    if (phaseNavigationTimerRef.current !== null) {
      window.clearTimeout(phaseNavigationTimerRef.current);
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setOverviewTargetPhaseId(phaseId);
    phaseRow.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    phaseNavigationTimerRef.current = window.setTimeout(() => {
      phaseNavigationTimerRef.current = null;
      setOverviewTargetPhaseId(null);
    }, reduceMotion ? 500 : 1200);
  }, []);

  useEffect(() => {
    if (!taskAssignmentContext?.taskId) return;

    const selectedNotesKey = `task:${taskAssignmentContext.phaseId}:${taskAssignmentContext.taskId}`;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && selectedTaskRowRef.current?.contains(target)) return;
      onTaskAssignmentContextChange(null);
      setOpenNotesKey((current) => current === selectedNotesKey ? null : current);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [taskAssignmentContext, onTaskAssignmentContextChange]);

  useEffect(() => {
    if (!activeAssignmentDrag) return;

    const markOutsideDropZone = (event: globalThis.DragEvent) => {
      positionAssignmentDragPreview(event.clientX, event.clientY);
      const target = event.target;
      const insideDropZone = target instanceof Element
        && Boolean(target.closest('[data-person-assignment-drop-zone="true"]'));
      if (insideDropZone) return;
      updateAssignmentDropTarget(null);
      setDragOverTask(null);
      onDragOverPhaseChange(null);
    };
    const markOutsideWindow = (event: globalThis.DragEvent) => {
      if (event.relatedTarget !== null) return;
      updateAssignmentDropTarget(null);
      setDragOverTask(null);
      onDragOverPhaseChange(null);
    };

    document.addEventListener("dragover", markOutsideDropZone, true);
    document.addEventListener("dragleave", markOutsideWindow, true);
    return () => {
      document.removeEventListener("dragover", markOutsideDropZone, true);
      document.removeEventListener("dragleave", markOutsideWindow, true);
    };
  }, [
    activeAssignmentDrag,
    onDragOverPhaseChange,
    positionAssignmentDragPreview,
    updateAssignmentDropTarget,
  ]);

  const beginAssignmentDrag = (
    event: DragEvent<HTMLButtonElement>,
    source: AssignmentDragSource,
  ) => {
    cancelAssignmentRemoval();
    setAssignmentRemovalActive(false);
    event.stopPropagation();
    writePersonDragPayload(event, source.personId, {
      phaseId: source.phaseId,
      taskId: source.taskId,
    });
    event.dataTransfer.effectAllowed = "move";
    const hiddenDragImage = document.createElement("span");
    hiddenDragImage.setAttribute("aria-hidden", "true");
    hiddenDragImage.style.cssText =
      "position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(hiddenDragImage);
    event.dataTransfer.setDragImage(hiddenDragImage, 0, 0);
    window.requestAnimationFrame(() => hiddenDragImage.remove());
    assignmentDropHandledRef.current = false;
    setAssignmentDragOrigin({ x: event.clientX, y: event.clientY });
    positionAssignmentDragPreview(event.clientX, event.clientY);
    setActiveAssignmentDrag(source);
    updateAssignmentDropTarget({ phaseId: source.phaseId, taskId: source.taskId });
    event.currentTarget.classList.add("is-dragging");
  };

  const finishAssignmentDrag = (source: AssignmentDragSource) => {
    if (!assignmentDropHandledRef.current && assignmentDropTargetRef.current === null) {
      assignmentDropHandledRef.current = true;
      setAssignmentRemovalActive(true);

      const removeAssignment = () => {
        assignmentRemovalTimerRef.current = null;
        if (source.taskId) {
          onUnassignPhaseTaskPerson(source.phaseId, source.taskId, source.personId);
        } else {
          onUnassignPerson(source.phaseId, source.personId);
        }
        assignmentDropHandledRef.current = false;
        clearAssignmentDragUi();
      };
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) removeAssignment();
      else {
        assignmentRemovalTimerRef.current = window.setTimeout(
          removeAssignment,
          ASSIGNMENT_REMOVE_ANIMATION_MS,
        );
      }
      return;
    }
    assignmentDropHandledRef.current = false;
    clearAssignmentDragUi();
  };

  const completeAssignmentDrop = () => {
    cancelAssignmentRemoval();
    assignmentDropHandledRef.current = true;
    clearAssignmentDragUi();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, phaseId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readPersonDragPayload(event);
    if (!payload) return;

    completeAssignmentDrop();
    onAssignPerson(phaseId, payload.personId);
    if (!payload.source) return;

    if (payload.source.taskId) {
      onUnassignPhaseTaskPerson(
        payload.source.phaseId,
        payload.source.taskId,
        payload.personId,
      );
    } else if (payload.source.phaseId !== phaseId) {
      onUnassignPerson(payload.source.phaseId, payload.personId);
    }
  };

  const handleTaskDrop = (
    event: DragEvent<HTMLDivElement>,
    phase: Phase,
    task: PhaseTask,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverTask(null);
    onDragOverPhaseChange(null);
    onTaskAssignmentContextChange({ phaseId: phase.id, taskId: task.id });

    const payload = readPersonDragPayload(event);
    if (!payload) return;
    const personIsInPhase = phase.assignments.some(
      (assignment) => assignment.personId === payload.personId,
    );
    if (!personIsInPhase) {
      completeAssignmentDrop();
      onTaskAssignmentRejected(phase.name);
      return;
    }

    completeAssignmentDrop();
    onAssignPhaseTaskPerson(phase.id, task.id, payload.personId);
    if (!payload.source) return;

    if (payload.source.taskId) {
      if (
        payload.source.phaseId !== phase.id
        || payload.source.taskId !== task.id
      ) {
        onUnassignPhaseTaskPerson(
          payload.source.phaseId,
          payload.source.taskId,
          payload.personId,
        );
      }
    } else if (payload.source.phaseId !== phase.id) {
      onUnassignPerson(payload.source.phaseId, payload.personId);
    }
  };

  const togglePhaseTasks = (phaseId: string) => {
    const opening = !expandedTaskPhases.has(phaseId);
    setExpandedTaskPhases((current) => {
      const next = new Set(current);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
    if (opening) {
      onTaskAssignmentContextChange({ phaseId, taskId: null });
    } else if (taskAssignmentContext?.phaseId === phaseId) {
      onTaskAssignmentContextChange(null);
    }
  };

  const addPhaseTask = (phaseId: string) => {
    setExpandedTaskPhases((current) => {
      if (current.has(phaseId)) return current;
      return new Set(current).add(phaseId);
    });
    onTaskAssignmentContextChange({ phaseId, taskId: null });
    onAddPhaseTask(phaseId);
  };

  const activeDraggedPerson = activeAssignmentDrag
    ? peopleById.get(activeAssignmentDrag.personId)
    : null;
  const assignmentDragPreview = activeAssignmentDrag
    && activeDraggedPerson
    && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={assignmentDragPreviewRef}
          className={`assignment-drag-preview${
            assignmentRemovalActive
              ? " is-removing"
              : assignmentDropTarget === null
                ? " is-remove-armed"
                : ""
          }`}
          style={{
            "--person-color": activeDraggedPerson.color,
            transform: `translate3d(${Math.round(
              assignmentDragOrigin.x - 21,
            )}px, ${Math.round(assignmentDragOrigin.y - 21)}px, 0)`,
          } as CSSProperties}
          aria-hidden="true"
        >
          <span className="assignment-drag-preview-avatar">
            {initials(activeDraggedPerson.name)}
          </span>
        </div>,
        document.body,
      )
    : null;

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
          <span className="phase-days-heading">Days</span>
          <span>Assigned people</span>
          <span className="phase-number-heading">Hours</span>
          {!planningMode && <span className="phase-number-heading">Cost</span>}
          <span className="phase-action-heading">Actions</span>
        </div>

        {project.phases.map((phase, index) => {
          const result = phaseResultsById.get(phase.id);
          const tasksExpanded = expandedTaskPhases.has(phase.id);
          const phaseNotesKey = `phase:${phase.id}`;
          const phaseNotesEditorId = `${notesIdPrefix}-phase-${index + 1}-notes`;

          return (
            <div
              id={`phase-row-${phase.id}`}
              className={`phase-row phase-tone-${(index % PHASE_TONES.length) + 1}${
                dragOverPhase === phase.id ? " drop-active" : ""
              }${overviewTargetPhaseId === phase.id ? " is-overview-target" : ""}`}
              style={phaseToneStyle(index)}
              key={phase.id}
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

              {phase.tasks.length ? (
                <div
                  className="phase-duration-summary"
                  aria-label={`${phase.name}: ${phase.days} workdays, calculated from sub-phases`}
                  title="Calculated from sub-phase durations"
                >
                  <strong>{phase.days}</strong>
                  <span>days</span>
                </div>
              ) : (
                <NumberStepper
                  className="phase-days-stepper"
                  size="md"
                  ariaLabel={`${phase.name} workdays`}
                  value={phase.days}
                  min={0}
                  step={1}
                  onChange={(days) => onUpdatePhase(phase.id, {
                    days: Math.max(0, Math.round(days)),
                  })}
                />
              )}

              <div
                className={`assignment-zone${
                  dragOverPhase === phase.id ? " drop-active" : ""
                }`}
                role="group"
                aria-label={`Assigned people for ${phase.name}. Drop people here.`}
                data-person-assignment-drop-zone="true"
                onDragEnter={(event) => {
                  if (!event.dataTransfer.types.includes(PERSON_DRAG_TYPE)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  updateAssignmentDropTarget({ phaseId: phase.id, taskId: null });
                  setDragOverTask(null);
                  onDragOverPhaseChange(phase.id);
                }}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(PERSON_DRAG_TYPE)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = activeAssignmentDrag ? "move" : "copy";
                  updateAssignmentDropTarget({ phaseId: phase.id, taskId: null });
                  onDragOverPhaseChange(phase.id);
                }}
                onDrop={(event) => handleDrop(event, phase.id)}
              >
                {phase.assignments.map((assignment) => {
                  const person = peopleById.get(assignment.personId);
                  if (!person) return null;
                  const isDragging = activeAssignmentDrag?.personId === person.id
                    && activeAssignmentDrag.phaseId === phase.id
                    && activeAssignmentDrag.taskId === null;

                  return (
                    <AssignmentAvatar
                      key={person.id}
                      currency={project.currency}
                      isDragging={isDragging}
                      isRemoving={isDragging && assignmentRemovalActive}
                      person={person}
                      planningMode={planningMode}
                      scopeLabel={phase.name}
                      source={{ phaseId: phase.id, taskId: null }}
                      onDragStart={beginAssignmentDrag}
                      onDragEnd={finishAssignmentDrag}
                    />
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
              <div className="phase-row-actions">
                <AiNoteButton
                  hasNotes={Boolean(phase.notes.trim())}
                  open={openNotesKey === phaseNotesKey}
                  onToggle={() => setOpenNotesKey((current) => (
                    current === phaseNotesKey ? null : phaseNotesKey
                  ))}
                  subject={phase.name || `phase ${index + 1}`}
                  controls={phaseNotesEditorId}
                />
                <IconButton
                  variant="danger"
                  className="phase-action-button"
                  label={`Remove ${phase.name}`}
                  onClick={() => onRemovePhase(phase.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </IconButton>
              </div>

              {openNotesKey === phaseNotesKey && (
                <AiNoteEditor
                  id={phaseNotesEditorId}
                  className="phase-notes-editor"
                  value={phase.notes}
                  onChange={(notes) => onUpdatePhase(phase.id, { notes })}
                  label={`Notes for ${phase.name || `phase ${index + 1}`}`}
                  placeholder="Add context, decisions, dependencies, or delivery instructions..."
                />
              )}

              <div className={`phase-task-section ${tasksExpanded ? "is-open" : ""}`}>
                <div className="phase-task-toolbar">
                  <button
                    type="button"
                    className="phase-task-toggle"
                    aria-expanded={tasksExpanded}
                    aria-controls={`phase-tasks-${phase.id}`}
                    onClick={() => togglePhaseTasks(phase.id)}
                  >
                    <span>Sub-phases</span>
                    <small aria-label={`${phase.tasks.length} sub-phases`}>
                      {phase.tasks.length}
                    </small>
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <Button
                    className="phase-task-add"
                    variant="ghost"
                    leadingIcon={<Plus size={15} />}
                    aria-label={`Add a sub-phase to ${phase.name}`}
                    onClick={() => addPhaseTask(phase.id)}
                  >
                    Add sub-phase
                  </Button>
                </div>

                {tasksExpanded && (
                  <div
                    className="phase-task-list"
                    id={`phase-tasks-${phase.id}`}
                    aria-label={`Sub-phases for ${phase.name}`}
                  >
                    {phase.tasks.map((task, taskIndex) => {
                      const taskResult = taskResultsByPhaseId.get(phase.id)?.get(task.id);
                      const taskIsActive = taskAssignmentContext?.phaseId === phase.id
                        && taskAssignmentContext.taskId === task.id;
                      const taskNotesKey = `task:${phase.id}:${task.id}`;
                      const taskNotesEditorId = `${notesIdPrefix}-phase-${index + 1}-task-${taskIndex + 1}-notes`;

                      return (
                        <div
                          ref={taskIsActive ? selectedTaskRowRef : undefined}
                          className={`phase-task-row${taskIsActive ? " is-assignment-active" : ""}`}
                          key={task.id}
                          onFocusCapture={() => onTaskAssignmentContextChange({
                            phaseId: phase.id,
                            taskId: task.id,
                          })}
                          onPointerDown={() => onTaskAssignmentContextChange({
                            phaseId: phase.id,
                            taskId: task.id,
                          })}
                        >
                          <div className="phase-task-main">
                            <span className="phase-task-index" aria-hidden="true">
                              {index + 1}.{taskIndex + 1}
                            </span>
                            <TextInput
                              className="phase-task-name"
                              aria-label={`Sub-phase ${taskIndex + 1} in ${phase.name}`}
                              placeholder="Sub-phase name"
                              value={task.name}
                              onChange={(event) => onUpdatePhaseTask(
                                phase.id,
                                task.id,
                                { name: event.target.value },
                              )}
                            />
                          </div>
                          <NumberStepper
                            className="phase-task-days"
                            size="md"
                            ariaLabel={`${task.name || `Task ${taskIndex + 1}`} workdays`}
                            value={task.days}
                            min={0}
                            step={1}
                            onChange={(days) => onUpdatePhaseTask(
                              phase.id,
                              task.id,
                              { days: Math.max(0, Math.round(days)) },
                            )}
                          />
                          <div
                            className={`phase-task-assignees${
                              dragOverTask === task.id ? " drop-active" : ""
                            }${task.assignments.length ? "" : " is-empty"}`}
                            role="group"
                            aria-label={`People assigned to ${task.name || `sub-phase ${taskIndex + 1}`}. Drop people from the People list here.`}
                            data-person-assignment-drop-zone="true"
                            onDragEnter={(event) => {
                              if (!event.dataTransfer.types.includes(PERSON_DRAG_TYPE)) return;
                              event.preventDefault();
                              event.stopPropagation();
                              setDragOverTask(task.id);
                              updateAssignmentDropTarget({
                                phaseId: phase.id,
                                taskId: task.id,
                              });
                              onDragOverPhaseChange(null);
                              onTaskAssignmentContextChange({
                                phaseId: phase.id,
                                taskId: task.id,
                              });
                            }}
                            onDragOver={(event) => {
                              if (!event.dataTransfer.types.includes(PERSON_DRAG_TYPE)) return;
                              event.preventDefault();
                              event.stopPropagation();
                              event.dataTransfer.dropEffect = activeAssignmentDrag ? "move" : "copy";
                              setDragOverTask(task.id);
                              updateAssignmentDropTarget({
                                phaseId: phase.id,
                                taskId: task.id,
                              });
                            }}
                            onDrop={(event) => handleTaskDrop(event, phase, task)}
                          >
                            {task.assignments.map((assignment) => {
                              const person = peopleById.get(assignment.personId);
                              if (!person) return null;
                              const isDragging = activeAssignmentDrag?.personId === person.id
                                && activeAssignmentDrag.phaseId === phase.id
                                && activeAssignmentDrag.taskId === task.id;

                              return (
                                <AssignmentAvatar
                                  key={person.id}
                                  currency={project.currency}
                                  isDragging={isDragging}
                                  isRemoving={isDragging && assignmentRemovalActive}
                                  person={person}
                                  planningMode={planningMode}
                                  scopeLabel={task.name || `sub-phase ${taskIndex + 1}`}
                                  source={{ phaseId: phase.id, taskId: task.id }}
                                  onDragStart={beginAssignmentDrag}
                                  onDragEnd={finishAssignmentDrag}
                                />
                              );
                            })}
                            {(!task.assignments.length || dragOverTask === task.id) && (
                              <span className="phase-task-drop-hint">
                                <UserPlus size={14} aria-hidden="true" />
                                {dragOverTask === task.id ? "Drop to assign" : "Drop people"}
                              </span>
                            )}
                          </div>
                          <div
                            className="phase-task-date"
                            title={`${longDate(taskResult?.start ?? "")} to ${longDate(taskResult?.end ?? "")}`}
                          >
                            <span>
                              <time dateTime={taskResult?.start || undefined}>
                                {friendlyDate(taskResult?.start ?? "")}
                              </time>
                              <i aria-hidden="true">→</i>
                              <time dateTime={taskResult?.end || undefined}>
                                {friendlyDate(taskResult?.end ?? "")}
                              </time>
                            </span>
                          </div>
                          <div className="phase-task-actions">
                            <AiNoteButton
                              hasNotes={Boolean(task.notes.trim())}
                              open={openNotesKey === taskNotesKey}
                              onToggle={() => setOpenNotesKey((current) => (
                                current === taskNotesKey ? null : taskNotesKey
                              ))}
                              subject={task.name || `sub-phase ${taskIndex + 1}`}
                              controls={taskNotesEditorId}
                            />
                            <IconButton
                              className="phase-task-remove"
                              variant="danger"
                              label={`Remove ${task.name || `sub-phase ${taskIndex + 1}`}`}
                              onClick={() => onRemovePhaseTask(phase.id, task.id)}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </IconButton>
                          </div>

                          {openNotesKey === taskNotesKey && (
                            <AiNoteEditor
                              id={taskNotesEditorId}
                              className="phase-task-notes-editor"
                              value={task.notes}
                              onChange={(notes) => onUpdatePhaseTask(
                                phase.id,
                                task.id,
                                { notes },
                              )}
                              label={`Notes for ${task.name || `sub-phase ${taskIndex + 1}`}`}
                              placeholder="Add task context, dependencies, ownership notes, or acceptance details..."
                            />
                          )}
                        </div>
                      );
                    })}

                    {!phase.tasks.length && (
                      <div className="phase-task-empty">
                        <span>No sub-phases yet.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      <MemoizedPhaseTotals
        project={project}
        people={people}
        calculation={calculation}
        planningMode={planningMode}
        onPhaseSelect={navigateToPhase}
      />
      {assignmentDragPreview}
    </section>
  );
}

export interface PhasesStaffingProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
  assistantOpen: boolean;
  maximizedPanel: DeliveryPanel | null;
  onMaximizedPanelChange: (panel: DeliveryPanel | null) => void;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onAddPhase: () => void;
  onUpdatePhase: (phaseId: string, patch: PhasePatch) => void;
  onRemovePhase: (phaseId: string) => void;
  onAssignPerson: (phaseId: string, personId: string) => void;
  onUnassignPerson: (phaseId: string, personId: string) => void;
  onAddPhaseTask: (phaseId: string) => void;
  onUpdatePhaseTask: (phaseId: string, taskId: string, patch: PhaseTaskPatch) => void;
  onRemovePhaseTask: (phaseId: string, taskId: string) => void;
  onAssignPhaseTaskPerson: (phaseId: string, taskId: string, personId: string) => void;
  onUnassignPhaseTaskPerson: (phaseId: string, taskId: string, personId: string) => void;
  onTaskAssignmentRejected: (phaseName: string) => void;
}

export function PhasesStaffing({
  project,
  people,
  calculation,
  planningMode,
  assistantOpen,
  maximizedPanel,
  onMaximizedPanelChange,
  onAddPerson,
  onEditPerson,
  onAddPhase,
  onUpdatePhase,
  onRemovePhase,
  onAssignPerson,
  onUnassignPerson,
  onAddPhaseTask,
  onUpdatePhaseTask,
  onRemovePhaseTask,
  onAssignPhaseTaskPerson,
  onUnassignPhaseTaskPerson,
  onTaskAssignmentRejected,
}: PhasesStaffingProps) {
  const [taskAssignmentContext, setTaskAssignmentContext] =
    useState<TaskAssignmentContext | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const updateTaskAssignmentContext = useCallback((next: TaskAssignmentContext | null) => {
    setTaskAssignmentContext((current) => (
      current?.phaseId === next?.phaseId && current?.taskId === next?.taskId
        ? current
        : next
    ));
  }, []);
  const showPeoplePanel = maximizedPanel === null || maximizedPanel === "people";
  const showPhasesPanel = maximizedPanel === null || maximizedPanel === "phases";
  const taskPhase = project.phases.find(
    (phase) => phase.id === taskAssignmentContext?.phaseId,
  ) ?? null;
  const task = taskPhase?.tasks.find(
    (phaseTask) => phaseTask.id === taskAssignmentContext?.taskId,
  ) ?? null;
  const compactPeopleRail = assistantOpen && maximizedPanel === null;

  const togglePanel = (panel: DeliveryPanel) => {
    runPanelViewTransition(() => {
      onMaximizedPanelChange(maximizedPanel === panel ? null : panel);
      setDragOverPhase(null);
    }, ".phases-card");
  };

  return (
    <SectionCard
      className={`phases-card${maximizedPanel ? " has-maximized-panel" : ""}`}
      title="Phases & staffing"
      titleId="phases-staffing-title"
    >
      <div className={`delivery-workspace${maximizedPanel ? " is-single" : ""}${
        compactPeopleRail ? " has-people-rail" : ""
      }`}>
        {showPeoplePanel && (
          <PeopleSidebar
            key={compactPeopleRail ? "compact" : "regular"}
            compact={compactPeopleRail}
            people={people}
            maximized={maximizedPanel === "people"}
            taskPhase={taskPhase}
            task={task}
            onAddPerson={onAddPerson}
            onEditPerson={onEditPerson}
            onToggleMaximized={() => togglePanel("people")}
            onPersonDragEnd={() => setDragOverPhase(null)}
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
            taskAssignmentContext={taskAssignmentContext}
            onAddPhase={onAddPhase}
            onUpdatePhase={onUpdatePhase}
            onRemovePhase={onRemovePhase}
            onAssignPerson={onAssignPerson}
            onUnassignPerson={onUnassignPerson}
            onAddPhaseTask={onAddPhaseTask}
            onUpdatePhaseTask={onUpdatePhaseTask}
            onRemovePhaseTask={onRemovePhaseTask}
            onAssignPhaseTaskPerson={onAssignPhaseTaskPerson}
            onUnassignPhaseTaskPerson={onUnassignPhaseTaskPerson}
            onTaskAssignmentContextChange={updateTaskAssignmentContext}
            onTaskAssignmentRejected={onTaskAssignmentRejected}
            onDragOverPhaseChange={setDragOverPhase}
            onToggleMaximized={() => togglePanel("phases")}
          />
        )}
      </div>
    </SectionCard>
  );
}
