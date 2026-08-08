"use client";

import {
  useId,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  EyeOff,
  Plus,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import {
  AiNoteButton,
  AiNoteEditor,
  Field,
  GlassDatePicker,
  GlassSelect,
  IconButton,
  MoneyInput,
  NotedNumberField,
  NumberStepper,
  PanelHeader,
  PanelSizeButton,
  SectionCard,
  TextInput,
  runPanelViewTransition,
  type GlassOption,
} from "@/components/ui";
import {
  BILLING_LABELS,
  DAY_LABELS,
  EXPENSE_BILLINGS,
  EXPENSE_UNITS,
  UNIT_LABELS,
} from "@/lib/pricing/constants.ts";
import { toggleWorkingDaySelection } from "@/lib/pricing/calendar.ts";
import { currencyFormat, friendlyDate } from "@/lib/pricing/formatters.ts";
import { selectVisibleModifiers } from "@/lib/pricing/selectors.ts";
import type {
  Currency,
  ExpenseBilling,
  ExpenseUnit,
  ModifierKind,
  ModifierTarget,
  ProjectPlan,
  ProjectSettingsPanel,
  ScenarioCalculation,
} from "@/lib/pricing/types.ts";
import type {
  ExpensePatch,
  ModifierPatch,
  ProjectPatch,
} from "@/lib/pricing/workspace.ts";

const CURRENCY_OPTIONS: ReadonlyArray<GlassOption<Currency>> = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "IQD", label: "IQD — Iraqi Dinar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "RUB", label: "RUB — Russian Ruble" },
];

const MODIFIER_TARGET_OPTIONS: ReadonlyArray<GlassOption<ModifierTarget>> = [
  { value: "price", label: "Price" },
  { value: "effort", label: "Effort" },
];

const EXPENSE_UNIT_OPTIONS: ReadonlyArray<GlassOption<ExpenseUnit>> = EXPENSE_UNITS.map(
  (value) => ({ value, label: UNIT_LABELS[value] }),
);

const EXPENSE_BILLING_OPTIONS: ReadonlyArray<GlassOption<ExpenseBilling>> =
  EXPENSE_BILLINGS.map((value) => ({ value, label: BILLING_LABELS[value] }));

export type ProjectPatchHandler = (patch: ProjectPatch) => void;
export type ModifierUpdateHandler = (modifierId: string, patch: ModifierPatch) => void;
export type ExpenseUpdateHandler = (expenseId: string, patch: ExpensePatch) => void;

export interface SettingsPanelControlProps {
  maximized: boolean;
  onToggleMaximize: () => void;
}

export interface SettingsNotesControlProps {
  openNotesKey: string | null;
  onToggleNotes: (notesKey: string) => void;
}

export interface CommercialSettingsProps
  extends SettingsPanelControlProps, SettingsNotesControlProps {
  project: ProjectPlan;
  planningMode: boolean;
  onProjectChange: ProjectPatchHandler;
}

export function CommercialSettings({
  maximized,
  onProjectChange,
  onToggleMaximize,
  onToggleNotes,
  openNotesKey,
  planningMode,
  project,
}: CommercialSettingsProps) {
  const idPrefix = useId().replace(/:/g, "");

  return (
    <section className="settings-column commercial-settings" aria-labelledby={`${idPrefix}-title`}>
      <PanelHeader
        title="Commercial"
        titleId={`${idPrefix}-title`}
        subtitle="Base pricing and project fees"
        icon={<CircleDollarSign size={18} />}
        iconTone="commercial"
        actions={(
          <PanelSizeButton
            label="Commercial"
            maximized={maximized}
            onToggle={onToggleMaximize}
          />
        )}
      />

      {planningMode ? (
        <div className="pricing-hidden-state">
          <EyeOff size={21} aria-hidden="true" />
          <div>
            <strong>Pricing controls hidden</strong>
            <span>Reveal pricing from the navigation bar when you need commercial controls.</span>
          </div>
        </div>
      ) : (
        <div className="settings-panel-grid commercial-grid">
          <Field label="Currency">
            <GlassSelect
              ariaLabel="Currency"
              value={project.currency}
              options={CURRENCY_OPTIONS}
              onChange={(currency) => onProjectChange({ currency })}
            />
          </Field>

          <NotedNumberField
            label="Base price / hour"
            value={project.baseHourlyPrice}
            onChange={(baseHourlyPrice) => onProjectChange({ baseHourlyPrice })}
            suffix={`${project.currency}/h`}
            min={0}
            notes={project.baseHourlyPriceNotes}
            onNotesChange={(baseHourlyPriceNotes) => onProjectChange({ baseHourlyPriceNotes })}
            notesOpen={openNotesKey === "commercial:base-price"}
            onNotesToggle={() => onToggleNotes("commercial:base-price")}
            noteSubject="base price per hour"
            notesId={`${idPrefix}-commercial-base-price-notes`}
            notePlaceholder="Explain how the base hourly price was chosen and which assumptions or approvals support it."
          />

          <NotedNumberField
            label="Fixed starting fee"
            value={project.fixedFee}
            onChange={(fixedFee) => onProjectChange({ fixedFee })}
            suffix={project.currency}
            min={0}
            step={50}
            notes={project.fixedFeeNotes}
            onNotesChange={(fixedFeeNotes) => onProjectChange({ fixedFeeNotes })}
            notesOpen={openNotesKey === "commercial:fixed-fee"}
            onNotesToggle={() => onToggleNotes("commercial:fixed-fee")}
            noteSubject="fixed starting fee"
            notesId={`${idPrefix}-commercial-fixed-fee-notes`}
            notePlaceholder="Explain what the fixed starting fee covers and why this amount was selected."
          />

          <NotedNumberField
            label="Manual price adjustment"
            value={project.manualAdjustment}
            onChange={(manualAdjustment) => onProjectChange({ manualAdjustment })}
            suffix={project.currency}
            step={50}
            notes={project.adjustmentReason}
            onNotesChange={(adjustmentReason) => onProjectChange({ adjustmentReason })}
            notesOpen={openNotesKey === "commercial:adjustment"}
            onNotesToggle={() => onToggleNotes("commercial:adjustment")}
            noteSubject="commercial adjustment"
            notesId={`${idPrefix}-commercial-adjustment-notes`}
            notePlaceholder="Explain why this adjustment is needed, who approved it, and which commercial assumption it represents."
          />
        </div>
      )}
    </section>
  );
}

export interface ScheduleTimeSettingsProps extends SettingsPanelControlProps {
  project: ProjectPlan;
  calculation: ScenarioCalculation;
  holidayDraft: string;
  onHolidayDraftChange: (value: string) => void;
  onProjectChange: ProjectPatchHandler;
}

export function ScheduleTimeSettings({
  calculation,
  holidayDraft,
  maximized,
  onHolidayDraftChange,
  onProjectChange,
  onToggleMaximize,
  project,
}: ScheduleTimeSettingsProps) {
  const idPrefix = useId().replace(/:/g, "");
  const workingDaysLabelId = `${idPrefix}-working-weekdays-label`;
  const workingDaysHintId = `${idPrefix}-working-weekdays-hint`;
  const holidayAlreadyExcluded = project.holidays.includes(holidayDraft);
  const hasCalculatedSchedule = project.workingDays.length > 0
    && Boolean(calculation.projectStart)
    && Boolean(calculation.projectEnd);

  const toggleWorkingDay = (day: number) => {
    const workingDays = toggleWorkingDaySelection(project.workingDays, day);
    onProjectChange({ workingDays });
  };

  const addHoliday = () => {
    if (!holidayDraft || holidayAlreadyExcluded) return;
    onProjectChange({ holidays: [...project.holidays, holidayDraft].sort() });
    onHolidayDraftChange("");
  };

  return (
    <section className="settings-column schedule-settings" aria-labelledby={`${idPrefix}-title`}>
      <PanelHeader
        title="Schedule & time"
        titleId={`${idPrefix}-title`}
        subtitle="Dates, capacity and working calendar"
        icon={<CalendarDays size={18} />}
        iconTone="schedule"
        actions={(
          <PanelSizeButton
            label="Schedule and time"
            maximized={maximized}
            onToggle={onToggleMaximize}
          />
        )}
      />

      <div className="settings-panel-grid schedule-primary-grid">
        <MoneyInput
          label="Default hours / day"
          value={project.defaultHours}
          onChange={(defaultHours) => onProjectChange({ defaultHours })}
          suffix="hours"
          min={0}
          max={24}
          step={0.5}
        />
        <Field label="Start date">
          <GlassDatePicker
            value={project.startDate}
            ariaLabel="Project start date"
            onChange={(startDate) => onProjectChange({ startDate })}
          />
        </Field>
      </div>

      <div className="schedule-row">
        <div>
          <div className="working-days-heading">
            <span className="mini-label" id={workingDaysLabelId}>Working weekdays</span>
            <span className="working-days-count" aria-live="polite">
              {project.workingDays.length} selected
            </span>
          </div>
          <div
            className="day-selector"
            role="group"
            aria-labelledby={workingDaysLabelId}
            aria-describedby={workingDaysHintId}
          >
            {DAY_LABELS.map((label, day) => {
              const selected = project.workingDays.includes(day);
              const isOnlySelectedDay = selected && project.workingDays.length === 1;
              return (
                <button
                  type="button"
                  key={label}
                  className={selected ? "active" : ""}
                  aria-pressed={selected}
                  disabled={isOnlySelectedDay}
                  title={isOnlySelectedDay ? "Keep at least one working weekday selected" : undefined}
                  onClick={() => toggleWorkingDay(day)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="working-days-hint" id={workingDaysHintId}>
            Weekdays move calendar dates and calendar-based expenses; phase effort stays in workdays.
            Keep at least one selected.
          </p>
        </div>

        <div className="holiday-box">
          <span className="mini-label">Excluded holidays</span>
          <div className="holiday-add">
            <GlassDatePicker
              value={holidayDraft}
              ariaLabel="Holiday date to exclude"
              onChange={onHolidayDraftChange}
              clearable
            />
            <IconButton
              label="Add holiday"
              disabled={!holidayDraft || holidayAlreadyExcluded}
              onClick={addHoliday}
            >
              <Plus size={16} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="holiday-chips">
            {project.holidays.map((holiday) => (
              <button
                type="button"
                key={holiday}
                aria-label={`Remove excluded holiday ${friendlyDate(holiday)}`}
                onClick={() => onProjectChange({
                  holidays: project.holidays.filter((item) => item !== holiday),
                })}
              >
                {friendlyDate(holiday)}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
            {!project.holidays.length && <small>No excluded dates</small>}
          </div>
        </div>
      </div>

      <div
        className={`schedule-summary${hasCalculatedSchedule ? "" : " is-unavailable"}`}
        aria-label="Calculated schedule"
        aria-live="polite"
      >
        <div className="schedule-summary-copy">
          <span>{hasCalculatedSchedule ? "Calculated timeline" : "Schedule unavailable"}</span>
          {hasCalculatedSchedule ? (
            <strong>
              {friendlyDate(calculation.projectStart)} to {friendlyDate(calculation.projectEnd)}
            </strong>
          ) : (
            <strong>Choose at least one working weekday to calculate project dates.</strong>
          )}
        </div>
        <div className="schedule-summary-stat">
          <span>Calendar span</span>
          <strong>{hasCalculatedSchedule ? `${calculation.calendarDays} days` : "Unavailable"}</strong>
        </div>
        <div className="schedule-summary-stat">
          <span>Phase effort</span>
          <strong>{calculation.totalWorkingDays} workdays</strong>
        </div>
      </div>
    </section>
  );
}

export interface ModifiersSettingsProps
  extends SettingsPanelControlProps, SettingsNotesControlProps {
  project: ProjectPlan;
  planningMode: boolean;
  onAddModifier: () => void;
  onUpdateModifier: ModifierUpdateHandler;
  onRemoveModifier: (modifierId: string) => void;
}

export function ModifiersSettings({
  maximized,
  onAddModifier,
  onRemoveModifier,
  onToggleMaximize,
  onToggleNotes,
  onUpdateModifier,
  openNotesKey,
  planningMode,
  project,
}: ModifiersSettingsProps) {
  const idPrefix = useId().replace(/:/g, "");
  const visibleModifiers = selectVisibleModifiers(project, planningMode);
  const title = planningMode ? "Effort adjustments" : "Modifiers";

  return (
    <section
      className="settings-column settings-subpanel modifier-settings"
      aria-labelledby={`${idPrefix}-title`}
    >
      <PanelHeader
        title={title}
        titleId={`${idPrefix}-title`}
        subtitle={planningMode
          ? "Adjust delivery effort without exposing price"
          : "Price and effort adjustments"}
        icon={<Sparkles size={18} />}
        iconTone="schedule"
        actions={(
          <>
            <IconButton
              label={planningMode ? "Add effort adjustment" : "Add modifier"}
              variant="accent"
              onClick={onAddModifier}
            >
              <Plus size={17} aria-hidden="true" />
            </IconButton>
            <PanelSizeButton
              label={title}
              maximized={maximized}
              onToggle={onToggleMaximize}
            />
          </>
        )}
      />

      <div className="data-list">
        {visibleModifiers.map((modifier) => {
          const notesKey = `modifier:${modifier.id}`;
          const notesEditorId = `${idPrefix}-modifier-notes-${encodeURIComponent(modifier.id)}`;
          const modifierLabel = modifier.name.trim() || "modifier";
          const kindOptions: ReadonlyArray<GlassOption<ModifierKind>> = [
            { value: "percentage", label: "Percent" },
            {
              value: "fixed",
              label: `Fixed ${modifier.target === "effort" ? "hours" : project.currency}`,
            },
          ];
          return (
            <div className="data-row modifier-row" key={modifier.id}>
              <TextInput
                className="row-name"
                aria-label={`${modifierLabel} name`}
                value={modifier.name}
                onChange={(event) => onUpdateModifier(modifier.id, { name: event.target.value })}
              />
              {planningMode ? (
                <span className="modifier-target-chip">
                  <Clock3 size={13} aria-hidden="true" />
                  Effort
                </span>
              ) : (
                <GlassSelect
                  ariaLabel={`${modifierLabel} target`}
                  value={modifier.target}
                  options={MODIFIER_TARGET_OPTIONS}
                  onChange={(target) => onUpdateModifier(modifier.id, { target })}
                />
              )}
              <GlassSelect
                ariaLabel={`${modifierLabel} type`}
                value={modifier.kind}
                options={kindOptions}
                onChange={(kind) => onUpdateModifier(modifier.id, { kind })}
              />
              <NumberStepper
                ariaLabel={`${modifierLabel} value`}
                value={modifier.value}
                step={1}
                suffix={modifier.kind === "percentage"
                  ? "%"
                  : modifier.target === "effort"
                    ? "h"
                    : project.currency}
                onChange={(value) => onUpdateModifier(modifier.id, { value })}
              />
              <AiNoteButton
                hasNotes={Boolean(modifier.notes.trim())}
                open={openNotesKey === notesKey}
                onToggle={() => onToggleNotes(notesKey)}
                subject={modifierLabel}
                controls={notesEditorId}
              />
              <IconButton
                label={`Remove ${modifierLabel}`}
                variant="danger"
                onClick={() => onRemoveModifier(modifier.id)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </IconButton>
              {openNotesKey === notesKey && (
                <AiNoteEditor
                  id={notesEditorId}
                  value={modifier.notes}
                  placeholder="Explain why this modifier exists, what assumption it represents, and when it should apply."
                  helpText="Saved with this project and included in JSON for future AI feedback."
                  onChange={(notes) => onUpdateModifier(modifier.id, { notes })}
                />
              )}
            </div>
          );
        })}
        {!visibleModifiers.length && (
          <div className="empty-inline" role="status">
            {planningMode ? "No effort adjustments" : "No price or effort modifiers"}
          </div>
        )}
      </div>
    </section>
  );
}

export interface ExpensesSettingsProps
  extends SettingsPanelControlProps, SettingsNotesControlProps {
  project: ProjectPlan;
  calculation: ScenarioCalculation;
  planningMode: boolean;
  onAddExpense: () => void;
  onUpdateExpense: ExpenseUpdateHandler;
  onRemoveExpense: (expenseId: string) => void;
}

export function ExpensesSettings({
  calculation,
  maximized,
  onAddExpense,
  onRemoveExpense,
  onToggleMaximize,
  onToggleNotes,
  onUpdateExpense,
  openNotesKey,
  planningMode,
  project,
}: ExpensesSettingsProps) {
  const idPrefix = useId().replace(/:/g, "");
  const expenseCosts = useMemo(
    () => new Map(calculation.expenseResults.map((result) => [result.id, result.cost])),
    [calculation.expenseResults],
  );

  if (planningMode) return null;

  return (
    <section
      className="settings-column settings-subpanel expense-settings"
      aria-labelledby={`${idPrefix}-title`}
    >
      <PanelHeader
        title="Expenses"
        titleId={`${idPrefix}-title`}
        subtitle="Internal, pass-through and marked-up costs"
        icon={<WalletCards size={18} />}
        iconTone="commercial"
        actions={(
          <>
            <IconButton label="Add expense" variant="accent" onClick={onAddExpense}>
              <Plus size={17} aria-hidden="true" />
            </IconButton>
            <PanelSizeButton
              label="Expenses"
              maximized={maximized}
              onToggle={onToggleMaximize}
            />
          </>
        )}
      />

      <div className="data-list">
        {project.expenses.map((expense) => {
          const notesKey = `expense:${expense.id}`;
          const notesEditorId = `${idPrefix}-expense-notes-${encodeURIComponent(expense.id)}`;
          const expenseLabel = expense.name.trim() || "expense";
          return (
            <div className="data-row expense-row" key={expense.id}>
              <TextInput
                className="row-name"
                aria-label={`${expenseLabel} name`}
                value={expense.name}
                onChange={(event) => onUpdateExpense(expense.id, { name: event.target.value })}
              />
              <NumberStepper
                ariaLabel={`${expenseLabel} amount`}
                value={expense.amount}
                min={0}
                step={1}
                suffix={project.currency}
                onChange={(amount) => onUpdateExpense(expense.id, { amount })}
              />
              <GlassSelect
                ariaLabel={`${expenseLabel} unit`}
                value={expense.unit}
                options={EXPENSE_UNIT_OPTIONS}
                onChange={(unit) => onUpdateExpense(expense.id, { unit })}
              />
              <GlassSelect
                ariaLabel={`${expenseLabel} billing`}
                value={expense.billing}
                options={EXPENSE_BILLING_OPTIONS}
                onChange={(billing) => onUpdateExpense(expense.id, { billing })}
              />
              {expense.billing === "markup" && (
                <NumberStepper
                  ariaLabel={`${expenseLabel} markup`}
                  value={expense.markup}
                  min={0}
                  step={1}
                  suffix="%"
                  onChange={(markup) => onUpdateExpense(expense.id, { markup })}
                />
              )}
              <strong>{currencyFormat(project.currency, expenseCosts.get(expense.id) ?? 0)}</strong>
              <AiNoteButton
                hasNotes={Boolean(expense.notes.trim())}
                open={openNotesKey === notesKey}
                onToggle={() => onToggleNotes(notesKey)}
                subject={expenseLabel}
                controls={notesEditorId}
              />
              <IconButton
                label={`Remove ${expenseLabel}`}
                variant="danger"
                onClick={() => onRemoveExpense(expense.id)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </IconButton>
              {openNotesKey === notesKey && (
                <AiNoteEditor
                  id={notesEditorId}
                  value={expense.notes}
                  placeholder="Explain why this expense is needed, how it was estimated, and any assumptions behind it."
                  helpText="Saved with this project and included in JSON for future AI feedback."
                  onChange={(notes) => onUpdateExpense(expense.id, { notes })}
                />
              )}
            </div>
          );
        })}
        {!project.expenses.length && (
          <div className="empty-inline" role="status">No additional expenses</div>
        )}
      </div>
    </section>
  );
}

export interface ProjectSettingsProps {
  project: ProjectPlan;
  calculation: ScenarioCalculation;
  planningMode: boolean;
  maximizedPanel: ProjectSettingsPanel | null;
  onMaximizedPanelChange: (panel: ProjectSettingsPanel | null) => void;
  onProjectChange: ProjectPatchHandler;
  onAddModifier: () => void;
  onUpdateModifier: ModifierUpdateHandler;
  onRemoveModifier: (modifierId: string) => void;
  onAddExpense: () => void;
  onUpdateExpense: ExpenseUpdateHandler;
  onRemoveExpense: (expenseId: string) => void;
}

export function ProjectSettings({
  calculation,
  maximizedPanel,
  onAddExpense,
  onAddModifier,
  onMaximizedPanelChange,
  onProjectChange,
  onRemoveExpense,
  onRemoveModifier,
  onUpdateExpense,
  onUpdateModifier,
  planningMode,
  project,
}: ProjectSettingsProps) {
  const [holidayDraft, setHolidayDraft] = useState("");
  const [openNotesKey, setOpenNotesKey] = useState<string | null>(null);
  const effectiveMaximizedPanel = planningMode && maximizedPanel === "expenses"
    ? null
    : maximizedPanel;
  const showCommercial = effectiveMaximizedPanel === null || effectiveMaximizedPanel === "commercial";
  const showSchedule = effectiveMaximizedPanel === null || effectiveMaximizedPanel === "schedule";
  const showModifiers = effectiveMaximizedPanel === null || effectiveMaximizedPanel === "modifiers";
  const showExpenses = !planningMode && (
    effectiveMaximizedPanel === null || effectiveMaximizedPanel === "expenses"
  );

  const toggleNotes = (notesKey: string) => {
    setOpenNotesKey((current) => current === notesKey ? null : notesKey);
  };

  const togglePanel = (panel: ProjectSettingsPanel) => {
    runPanelViewTransition(() => {
      onMaximizedPanelChange(effectiveMaximizedPanel === panel ? null : panel);
    }, ".settings-card");
  };

  return (
    <SectionCard
      className={`settings-card${effectiveMaximizedPanel ? " has-maximized-panel" : ""}`}
      title="Project settings"
    >

      {(showCommercial || showSchedule) && (
        <div className={`settings-layout${effectiveMaximizedPanel ? " is-single" : ""}`}>
          {showCommercial && (
            <CommercialSettings
              project={project}
              planningMode={planningMode}
              maximized={effectiveMaximizedPanel === "commercial"}
              onToggleMaximize={() => togglePanel("commercial")}
              openNotesKey={openNotesKey}
              onToggleNotes={toggleNotes}
              onProjectChange={onProjectChange}
            />
          )}
          {showSchedule && (
            <ScheduleTimeSettings
              project={project}
              calculation={calculation}
              maximized={effectiveMaximizedPanel === "schedule"}
              onToggleMaximize={() => togglePanel("schedule")}
              holidayDraft={holidayDraft}
              onHolidayDraftChange={setHolidayDraft}
              onProjectChange={onProjectChange}
            />
          )}
        </div>
      )}

      {(showModifiers || showExpenses) && (
        <div className={`settings-extensions${planningMode || effectiveMaximizedPanel ? " is-single" : ""}`}>
          {showModifiers && (
            <ModifiersSettings
              project={project}
              planningMode={planningMode}
              maximized={effectiveMaximizedPanel === "modifiers"}
              onToggleMaximize={() => togglePanel("modifiers")}
              openNotesKey={openNotesKey}
              onToggleNotes={toggleNotes}
              onAddModifier={onAddModifier}
              onUpdateModifier={onUpdateModifier}
              onRemoveModifier={onRemoveModifier}
            />
          )}
          {showExpenses && (
            <ExpensesSettings
              project={project}
              calculation={calculation}
              planningMode={planningMode}
              maximized={effectiveMaximizedPanel === "expenses"}
              onToggleMaximize={() => togglePanel("expenses")}
              openNotesKey={openNotesKey}
              onToggleNotes={toggleNotes}
              onAddExpense={onAddExpense}
              onUpdateExpense={onUpdateExpense}
              onRemoveExpense={onRemoveExpense}
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}
