"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  FileDown,
  GripVertical,
  HardDrive,
  Info,
  LockKeyhole,
  Minus,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { gcm } from "@noble/ciphers/aes";
import { bytesToUtf8, utf8ToBytes } from "@noble/ciphers/utils";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";

type Currency = "USD" | "IQD" | "EUR" | "GBP";
type PersonType = "Employee" | "Intern" | "Contractor" | "Freelancer" | "Advisor";
type ExpenseUnit = "fixed" | "person_hour" | "workday" | "calendar_day" | "month";
type ExpenseBilling = "internal" | "pass_through" | "markup";
type ModifierTarget = "effort" | "price";
type ModifierKind = "percentage" | "fixed";
type ViewMode = "internal" | "client";

type Person = {
  id: string;
  name: string;
  type: PersonType;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  skills: string;
  notes: string;
  hourlyCost: number;
  defaultHours: number;
  color: string;
};

type Assignment = {
  personId: string;
  hoursPerDay: number;
};

type Phase = {
  id: string;
  name: string;
  days: number;
  schedule: "sequential" | "parallel";
  assignments: Assignment[];
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  unit: ExpenseUnit;
  billing: ExpenseBilling;
  markup: number;
};

type Modifier = {
  id: string;
  name: string;
  kind: ModifierKind;
  target: ModifierTarget;
  value: number;
};

type Scenario = {
  id: string;
  name: string;
  projectName: string;
  currency: Currency;
  startDate: string;
  clientRate: number;
  fixedFee: number;
  defaultHours: number;
  targetMargin: number;
  riskReserve: number;
  rounding: number;
  workingDays: number[];
  holidays: string[];
  phases: Phase[];
  expenses: Expense[];
  modifiers: Modifier[];
  manualAdjustment: number;
  adjustmentReason: string;
};

type Workspace = {
  app: "voxe-pricing-studio";
  schemaVersion: 1;
  activeScenarioId: string;
  people: Person[];
  scenarios: Scenario[];
};

type PhaseResult = {
  id: string;
  rawHours: number;
  adjustedHours: number;
  laborCost: number;
  revenue: number;
  start: string;
  end: string;
};

const STORAGE_KEY = "voxe-pricing-studio-v1";
const COLORS = ["#7c5cff", "#eb6cff", "#33c7b7", "#ff985c", "#5d91ff", "#d9b84f"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const makePerson = (person: Partial<Person> & Pick<Person, "name" | "role">): Person => ({
  id: uid(),
  name: person.name,
  type: person.type ?? "Employee",
  role: person.role,
  department: person.department ?? "Delivery",
  email: person.email ?? "",
  phone: person.phone ?? "",
  location: person.location ?? "Baghdad, Iraq",
  skills: person.skills ?? "",
  notes: person.notes ?? "",
  hourlyCost: person.hourlyCost ?? 10,
  defaultHours: person.defaultHours ?? 6,
  color: person.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
});

const initialWorkspace = (): Workspace => {
  const designer = makePerson({
    name: "Maya Al-Safi",
    role: "Product Designer",
    department: "Design",
    hourlyCost: 12,
    skills: "Product design, research, prototyping",
    color: COLORS[1],
  });
  const developer = makePerson({
    name: "Omar Nouri",
    role: "Full-stack Engineer",
    department: "Engineering",
    hourlyCost: 16,
    skills: "TypeScript, React, APIs",
    color: COLORS[0],
  });
  const qa = makePerson({
    name: "Rana Aziz",
    role: "QA Specialist",
    department: "Quality",
    hourlyCost: 9,
    skills: "Manual QA, test planning, UAT",
    color: COLORS[2],
  });
  const aiContractor = makePerson({
    name: "Noor Haddad",
    role: "AI Voice Specialist",
    type: "Contractor",
    department: "AI Lab",
    hourlyCost: 24,
    defaultHours: 4,
    skills: "Voice AI, model evaluation, Arabic TTS",
    color: COLORS[3],
  });

  const scenarioId = uid();
  return {
    app: "voxe-pricing-studio",
    schemaVersion: 1,
    activeScenarioId: scenarioId,
    people: [designer, developer, qa, aiContractor],
    scenarios: [
      {
        id: scenarioId,
        name: "Standard",
        projectName: "Customer Operations Platform",
        currency: "USD",
        startDate: "2026-08-09",
        clientRate: 55,
        fixedFee: 1500,
        defaultHours: 6,
        targetMargin: 35,
        riskReserve: 15,
        rounding: 100,
        workingDays: [0, 1, 2, 3, 4],
        holidays: [],
        phases: [
          {
            id: uid(),
            name: "Discovery & architecture",
            days: 5,
            schedule: "sequential",
            assignments: [
              { personId: designer.id, hoursPerDay: 4 },
              { personId: developer.id, hoursPerDay: 3 },
            ],
          },
          {
            id: uid(),
            name: "Product design",
            days: 8,
            schedule: "sequential",
            assignments: [
              { personId: designer.id, hoursPerDay: 6 },
              { personId: developer.id, hoursPerDay: 2 },
            ],
          },
          {
            id: uid(),
            name: "Build & integrations",
            days: 20,
            schedule: "sequential",
            assignments: [
              { personId: developer.id, hoursPerDay: 6 },
              { personId: aiContractor.id, hoursPerDay: 4 },
            ],
          },
          {
            id: uid(),
            name: "QA, UAT & launch",
            days: 7,
            schedule: "sequential",
            assignments: [
              { personId: qa.id, hoursPerDay: 6 },
              { personId: developer.id, hoursPerDay: 2 },
            ],
          },
        ],
        expenses: [
          {
            id: uid(),
            name: "Cloud development environment",
            amount: 240,
            unit: "fixed",
            billing: "internal",
            markup: 0,
          },
          {
            id: uid(),
            name: "AI sandbox usage",
            amount: 1.25,
            unit: "person_hour",
            billing: "markup",
            markup: 15,
          },
        ],
        modifiers: [
          { id: uid(), name: "AI integration complexity", kind: "percentage", target: "price", value: 12 },
          { id: uid(), name: "Delivery contingency", kind: "percentage", target: "effort", value: 8 },
        ],
        manualAdjustment: 0,
        adjustmentReason: "",
      },
    ],
  };
};

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const dateFromString = (value: string) => {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime()) ? new Date("2026-08-09T12:00:00") : date;
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const workDateAtOffset = (startValue: string, offset: number, workingDays: number[], holidays: string[]) => {
  const activeDays = workingDays.length ? workingDays : [0, 1, 2, 3, 4];
  const holidaySet = new Set(holidays);
  let current = dateFromString(startValue);
  let guard = 0;
  const isWorking = (date: Date) => activeDays.includes(date.getDay()) && !holidaySet.has(dateKey(date));

  while (!isWorking(current) && guard < 370) {
    current = addDays(current, 1);
    guard += 1;
  }

  let remaining = Math.max(0, Math.floor(offset));
  while (remaining > 0 && guard < 5000) {
    current = addDays(current, 1);
    if (isWorking(current)) remaining -= 1;
    guard += 1;
  }
  return current;
};

const friendlyDate = (value: string) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    dateFromString(value),
  );
};

const currencyFormat = (currency: Currency, value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: currency === "IQD" ? 0 : 0,
  }).format(Number.isFinite(value) ? value : 0);

const unitLabels: Record<ExpenseUnit, string> = {
  fixed: "Fixed once",
  person_hour: "Per person-hour",
  workday: "Per workday",
  calendar_day: "Per calendar day",
  month: "Per month",
};

const billingLabels: Record<ExpenseBilling, string> = {
  internal: "Internal only",
  pass_through: "Pass at cost",
  markup: "Pass + markup",
};

type GlassOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const personTypeClass = (type: PersonType) => type.toLowerCase().replace(" ", "-");

function calculateScenario(scenario: Scenario, people: Person[]) {
  const personMap = new Map(people.map((person) => [person.id, person]));
  const groups: Phase[][] = [];
  scenario.phases.forEach((phase) => {
    if (phase.schedule === "parallel" && groups.length) groups[groups.length - 1].push(phase);
    else groups.push([phase]);
  });

  let workingOffset = 0;
  const rawPhaseData = new Map<string, { rawHours: number; rawCost: number; start: string; end: string }>();
  groups.forEach((group) => {
    const groupDuration = Math.max(0, ...group.map((phase) => Math.max(0, Math.round(phase.days))));
    group.forEach((phase) => {
      const days = Math.max(0, Math.round(phase.days));
      const rawHours = phase.assignments.reduce(
        (sum, assignment) => sum + days * Math.max(0, assignment.hoursPerDay),
        0,
      );
      const rawCost = phase.assignments.reduce((sum, assignment) => {
        const person = personMap.get(assignment.personId);
        return sum + days * Math.max(0, assignment.hoursPerDay) * Math.max(0, person?.hourlyCost ?? 0);
      }, 0);
      const start = dateKey(workDateAtOffset(scenario.startDate, workingOffset, scenario.workingDays, scenario.holidays));
      const end = dateKey(
        workDateAtOffset(
          scenario.startDate,
          workingOffset + Math.max(0, days - 1),
          scenario.workingDays,
          scenario.holidays,
        ),
      );
      rawPhaseData.set(phase.id, { rawHours, rawCost, start, end });
    });
    workingOffset += groupDuration;
  });

  const rawHours = Array.from(rawPhaseData.values()).reduce((sum, phase) => sum + phase.rawHours, 0);
  const rawLaborCost = Array.from(rawPhaseData.values()).reduce((sum, phase) => sum + phase.rawCost, 0);
  const effortPercent = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const fixedEffortHours = scenario.modifiers
    .filter((modifier) => modifier.target === "effort" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const effortMultiplier = Math.max(0, 1 + effortPercent / 100);
  const totalHours = Math.max(0, rawHours * effortMultiplier + fixedEffortHours);
  const weightedLaborRate = rawHours > 0 ? rawLaborCost / rawHours : 0;
  const laborCost = Math.max(0, rawLaborCost * effortMultiplier + fixedEffortHours * weightedLaborRate);

  const phaseResults: PhaseResult[] = scenario.phases.map((phase) => {
    const raw = rawPhaseData.get(phase.id) ?? { rawHours: 0, rawCost: 0, start: "", end: "" };
    const share = rawHours > 0 ? raw.rawHours / rawHours : 0;
    const adjustedHours = Math.max(0, raw.rawHours * effortMultiplier + fixedEffortHours * share);
    const averageRate = raw.rawHours > 0 ? raw.rawCost / raw.rawHours : weightedLaborRate;
    return {
      id: phase.id,
      rawHours: raw.rawHours,
      adjustedHours,
      laborCost: Math.max(0, raw.rawCost * effortMultiplier + fixedEffortHours * share * averageRate),
      revenue: adjustedHours * scenario.clientRate,
      start: raw.start,
      end: raw.end,
    };
  });

  const totalWorkingDays = workingOffset;
  const projectStart = dateKey(workDateAtOffset(scenario.startDate, 0, scenario.workingDays, scenario.holidays));
  const projectEnd = dateKey(
    workDateAtOffset(
      scenario.startDate,
      Math.max(0, totalWorkingDays - 1),
      scenario.workingDays,
      scenario.holidays,
    ),
  );
  const calendarDays = totalWorkingDays
    ? Math.max(1, Math.round((dateFromString(projectEnd).getTime() - dateFromString(projectStart).getTime()) / 86400000) + 1)
    : 0;

  const expenseResults = scenario.expenses.map((expense) => {
    let multiplier = 1;
    if (expense.unit === "person_hour") multiplier = totalHours;
    if (expense.unit === "workday") multiplier = totalWorkingDays;
    if (expense.unit === "calendar_day") multiplier = calendarDays;
    if (expense.unit === "month") multiplier = calendarDays / 30.4;
    const cost = Math.max(0, expense.amount * multiplier);
    const billable =
      expense.billing === "internal"
        ? 0
        : expense.billing === "markup"
          ? cost * (1 + expense.markup / 100)
          : cost;
    return { id: expense.id, cost, billable };
  });

  const expenseCost = expenseResults.reduce((sum, expense) => sum + expense.cost, 0);
  const billableExpenses = expenseResults.reduce((sum, expense) => sum + expense.billable, 0);
  const baseRevenue = Math.max(0, scenario.fixedFee + totalHours * scenario.clientRate);
  const pricePercent = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const fixedPriceModifiers = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const modifierRevenue = baseRevenue * (pricePercent / 100) + fixedPriceModifiers;
  const unroundedQuote = Math.max(
    0,
    baseRevenue + modifierRevenue + billableExpenses + scenario.manualAdjustment,
  );
  const rounding = Math.max(1, scenario.rounding || 1);
  const quote = Math.round(unroundedQuote / rounding) * rounding;
  const estimatedCost = laborCost + expenseCost;
  const riskAdjustedCost = estimatedCost * (1 + Math.max(0, scenario.riskReserve) / 100);
  const targetMargin = clamp(scenario.targetMargin, 0, 95) / 100;
  const safePrice = targetMargin < 1 ? riskAdjustedCost / (1 - targetMargin) : riskAdjustedCost;
  const grossProfit = quote - estimatedCost;
  const guardedProfit = quote - riskAdjustedCost;
  const grossMargin = quote > 0 ? (grossProfit / quote) * 100 : 0;
  const guardedMargin = quote > 0 ? (guardedProfit / quote) * 100 : 0;

  const warnings: string[] = [];
  if (!scenario.workingDays.length) warnings.push("Select at least one working weekday.");
  if (!scenario.phases.length) warnings.push("Add at least one delivery phase.");
  if (scenario.phases.some((phase) => !phase.assignments.length)) warnings.push("One or more phases have no people assigned.");
  if (scenario.phases.some((phase) => phase.assignments.some((assignment) => assignment.hoursPerDay > 24))) {
    warnings.push("An assignment exceeds 24 hours per day.");
  }
  if (quote < safePrice) warnings.push("The quote is below the risk-adjusted target margin.");
  if (guardedProfit < 0) warnings.push("The quote is loss-making after the risk reserve.");

  return {
    rawHours,
    totalHours,
    laborCost,
    expenseCost,
    estimatedCost,
    riskAdjustedCost,
    billableExpenses,
    baseRevenue,
    modifierRevenue,
    quote,
    grossProfit,
    guardedProfit,
    grossMargin,
    guardedMargin,
    safePrice,
    totalWorkingDays,
    calendarDays,
    projectStart,
    projectEnd,
    phaseResults,
    expenseResults,
    warnings,
  };
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

async function encryptedPayload(workspace: Workspace, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = pbkdf2(sha256, password, salt, { c: 250000, dkLen: 32 });
  const data = gcm(key, iv).encrypt(utf8ToBytes(JSON.stringify(workspace)));
  return {
    format: "voxe-pricing-encrypted",
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(data),
  };
}

async function decryptPayload(payload: Record<string, unknown>, password: string): Promise<Workspace> {
  const salt = base64ToBytes(String(payload.salt));
  const iv = base64ToBytes(String(payload.iv));
  const key = pbkdf2(sha256, password, salt, { c: 250000, dkLen: 32 });
  const plain = gcm(key, iv).decrypt(base64ToBytes(String(payload.data)));
  return JSON.parse(bytesToUtf8(plain)) as Workspace;
}

const isWorkspace = (value: unknown): value is Workspace => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Workspace>;
  return candidate.app === "voxe-pricing-studio" && Array.isArray(candidate.people) && Array.isArray(candidate.scenarios);
};

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const safeFilename = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "voxe-project";

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={"modal glass-panel " + (wide ? "modal-wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Voxe workspace</p>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function GlassSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: string;
  options: GlassOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const maxHeight = Math.min(320, Math.max(160, window.innerHeight - viewportPadding * 2));
    const openAbove = availableBelow < 180 && rect.top > availableBelow;
    setMenuStyle({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 190) - viewportPadding)),
      top: openAbove ? Math.max(viewportPadding, rect.top - Math.min(maxHeight, options.length * 48 + 16) - gap) : rect.bottom + gap,
      width: Math.max(rect.width, 190),
      maxHeight,
    });
  }, [options.length]);

  const openMenu = () => {
    positionMenu();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePosition = () => positionMenu();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handlePosition);
    window.addEventListener("scroll", handlePosition, true);
    window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handlePosition);
      window.removeEventListener("scroll", handlePosition, true);
    };
  }, [open, positionMenu]);

  const choose = (option: GlassOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          className="glass-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          onBlur={() => window.requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!menuRef.current?.contains(active) && active !== triggerRef.current) setOpen(false);
          })}
        >
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="glass-select-option"
              disabled={option.disabled}
              key={option.value}
              onClick={() => choose(option)}
              onKeyDown={(event) => {
                const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(".glass-select-option:not(:disabled)") ?? []);
                const index = items.indexOf(event.currentTarget);
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
                  items[next]?.focus();
                } else if (event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  items[event.key === "Home" ? 0 : items.length - 1]?.focus();
                } else if (event.key.length === 1 && /\S/.test(event.key)) {
                  const query = event.key.toLocaleLowerCase();
                  const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
                  ordered.find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(query))?.focus();
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} />}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={"glass-select-trigger " + className}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={16} className={open ? "rotated" : ""} />
      </button>
      {menu}
    </>
  );
}

function NumberStepper({
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
  ariaLabel,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  const commit = (nextValue: number) => {
    const bounded = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, nextValue));
    const normalized = Math.round((bounded + Number.EPSILON) * 10000) / 10000;
    setDraft(String(normalized));
    onChange(normalized);
  };

  const stepBy = (direction: -1 | 1) => {
    const current = editing ? Number(draft) : value;
    commit((Number.isFinite(current) ? current : value) + step * direction);
  };

  return (
    <div className={"number-stepper " + (compact ? "compact-stepper" : "") }>
      <button type="button" onClick={() => stepBy(-1)} disabled={min !== undefined && value <= min} aria-label={"Decrease " + ariaLabel}>
        <Minus size={compact ? 13 : 15} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={editing ? draft : String(value)}
        min={min}
        max={max}
        step={step}
        onFocus={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const parsed = Number(nextDraft);
          if (nextDraft !== "" && nextDraft !== "-" && Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={() => {
          const parsed = Number(draft);
          commit(Number.isFinite(parsed) ? parsed : value);
          setEditing(false);
        }}
      />
      {suffix && <em>{suffix}</em>}
      <button type="button" onClick={() => stepBy(1)} disabled={max !== undefined && value >= max} aria-label={"Increase " + ariaLabel}>
        <Plus size={compact ? 13 : 15} />
      </button>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  label,
  suffix,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <NumberStepper value={value} onChange={onChange} suffix={suffix} min={min} max={max} step={step} ariaLabel={label} />
    </label>
  );
}

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>(() => initialWorkspace());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewMode>("internal");
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [phasePickerId, setPhasePickerId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [toast, setToast] = useState("");
  const [holidayDraft, setHolidayDraft] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const scenario = workspace.scenarios.find((item) => item.id === workspace.activeScenarioId) ?? workspace.scenarios[0];
  const calculation = useMemo(
    () => calculateScenario(scenario, workspace.people),
    [scenario, workspace.people],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          if (isWorkspace(parsed) && parsed.scenarios.length) setWorkspace(parsed);
        }
      } catch {
        // A damaged browser draft should never block the calculator.
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace, hydrated]);

  useEffect(() => {
    const trustedLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if ("serviceWorker" in navigator && (window.location.protocol === "https:" || trustedLocal)) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline installation is optional; the calculator itself remains fully usable.
      });
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateScenario = (patch: Partial<Scenario>) => {
    setWorkspace((current) => ({
      ...current,
      scenarios: current.scenarios.map((item) =>
        item.id === current.activeScenarioId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const updatePhase = (phaseId: string, patch: Partial<Phase>) => {
    updateScenario({
      phases: scenario.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...patch } : phase)),
    });
  };

  const addPhase = () => {
    updateScenario({
      phases: [
        ...scenario.phases,
        { id: uid(), name: "New phase", days: 5, schedule: "sequential", assignments: [] },
      ],
    });
  };

  const removePhase = (phaseId: string) => {
    updateScenario({ phases: scenario.phases.filter((phase) => phase.id !== phaseId) });
  };

  const assignPerson = (phaseId: string, personId: string) => {
    const person = workspace.people.find((item) => item.id === personId);
    const phase = scenario.phases.find((item) => item.id === phaseId);
    if (!person || !phase || phase.assignments.some((assignment) => assignment.personId === personId)) return;
    updatePhase(phaseId, {
      assignments: [...phase.assignments, { personId, hoursPerDay: person.defaultHours || scenario.defaultHours }],
    });
    setPhasePickerId(null);
  };

  const unassignPerson = (phaseId: string, personId: string) => {
    const phase = scenario.phases.find((item) => item.id === phaseId);
    if (!phase) return;
    updatePhase(phaseId, {
      assignments: phase.assignments.filter((assignment) => assignment.personId !== personId),
    });
  };

  const updateAssignmentHours = (phaseId: string, personId: string, hoursPerDay: number) => {
    const phase = scenario.phases.find((item) => item.id === phaseId);
    if (!phase) return;
    updatePhase(phaseId, {
      assignments: phase.assignments.map((assignment) =>
        assignment.personId === personId ? { ...assignment, hoursPerDay } : assignment,
      ),
    });
  };

  const handleDrop = (event: DragEvent, phaseId: string) => {
    event.preventDefault();
    const personId = event.dataTransfer.getData("application/x-voxe-person");
    if (personId) assignPerson(phaseId, personId);
    setDragOverPhase(null);
  };

  const openNewPerson = () => {
    setEditingPerson(
      makePerson({
        name: "",
        role: "",
        type: "Employee",
        department: "Delivery",
        hourlyCost: 0,
        defaultHours: scenario.defaultHours,
      }),
    );
    setIsNewPerson(true);
  };

  const savePerson = (event: FormEvent) => {
    event.preventDefault();
    if (!editingPerson || !editingPerson.name.trim() || !editingPerson.role.trim()) return;
    setWorkspace((current) => ({
      ...current,
      people: isNewPerson
        ? [...current.people, editingPerson]
        : current.people.map((person) => (person.id === editingPerson.id ? editingPerson : person)),
    }));
    setEditingPerson(null);
    setIsNewPerson(false);
    setToast(isNewPerson ? "Person added to your pool" : "Profile updated");
  };

  const deletePerson = () => {
    if (!editingPerson || isNewPerson) return;
    const personId = editingPerson.id;
    setWorkspace((current) => ({
      ...current,
      people: current.people.filter((person) => person.id !== personId),
      scenarios: current.scenarios.map((item) => ({
        ...item,
        phases: item.phases.map((phase) => ({
          ...phase,
          assignments: phase.assignments.filter((assignment) => assignment.personId !== personId),
        })),
      })),
    }));
    setEditingPerson(null);
    setToast("Person removed from the workspace");
  };

  const addExpense = () => {
    updateScenario({
      expenses: [
        ...scenario.expenses,
        { id: uid(), name: "New expense", amount: 0, unit: "fixed", billing: "internal", markup: 0 },
      ],
    });
  };

  const updateExpense = (expenseId: string, patch: Partial<Expense>) => {
    updateScenario({
      expenses: scenario.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, ...patch } : expense,
      ),
    });
  };

  const addModifier = () => {
    updateScenario({
      modifiers: [
        ...scenario.modifiers,
        { id: uid(), name: "New modifier", kind: "percentage", target: "price", value: 0 },
      ],
    });
  };

  const updateModifier = (modifierId: string, patch: Partial<Modifier>) => {
    updateScenario({
      modifiers: scenario.modifiers.map((modifier) =>
        modifier.id === modifierId ? { ...modifier, ...patch } : modifier,
      ),
    });
  };

  const duplicateScenario = () => {
    const copy: Scenario = JSON.parse(JSON.stringify(scenario)) as Scenario;
    copy.id = uid();
    copy.name = scenario.name + " copy";
    copy.phases = copy.phases.map((phase) => ({ ...phase, id: uid() }));
    copy.expenses = copy.expenses.map((expense) => ({ ...expense, id: uid() }));
    copy.modifiers = copy.modifiers.map((modifier) => ({ ...modifier, id: uid() }));
    setWorkspace((current) => ({
      ...current,
      activeScenarioId: copy.id,
      scenarios: [...current.scenarios, copy],
    }));
    setToast("Scenario duplicated");
  };

  const deleteScenario = () => {
    if (workspace.scenarios.length <= 1) return;
    const remaining = workspace.scenarios.filter((item) => item.id !== scenario.id);
    setWorkspace((current) => ({
      ...current,
      activeScenarioId: remaining[0].id,
      scenarios: remaining,
    }));
    setToast("Scenario removed");
  };

  const exportEncrypted = async () => {
    if (backupPassword.length < 8) {
      setToast("Use at least 8 characters for the backup password");
      return;
    }
    const payload = await encryptedPayload(workspace, backupPassword);
    downloadJson(payload, safeFilename(scenario.projectName) + ".voxe.enc.json");
    setBackupPassword("");
    setBackupOpen(false);
    setToast("Encrypted backup downloaded");
  };

  const exportPlain = () => {
    downloadJson(workspace, safeFilename(scenario.projectName) + ".voxe.json");
    setBackupOpen(false);
    setToast("Plain workspace file downloaded");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).format === "voxe-pricing-encrypted") {
        setPendingImport(parsed as Record<string, unknown>);
        setImportPassword("");
        return;
      }
      if (!isWorkspace(parsed) || !parsed.scenarios.length) throw new Error("Invalid workspace");
      setWorkspace(parsed);
      setToast("Workspace imported");
    } catch {
      setToast("That file is not a valid Voxe workspace");
    }
  };

  const unlockImport = async () => {
    if (!pendingImport) return;
    try {
      const parsed = await decryptPayload(pendingImport, importPassword);
      if (!isWorkspace(parsed) || !parsed.scenarios.length) throw new Error("Invalid workspace");
      setWorkspace(parsed);
      setPendingImport(null);
      setImportPassword("");
      setToast("Encrypted workspace imported");
    } catch {
      setToast("Could not decrypt that backup");
    }
  };

  const toggleWorkingDay = (day: number) => {
    const next = scenario.workingDays.includes(day)
      ? scenario.workingDays.filter((item) => item !== day)
      : [...scenario.workingDays, day].sort();
    updateScenario({ workingDays: next });
  };

  const phaseResult = (phaseId: string) => calculation.phaseResults.find((item) => item.id === phaseId);
  const expenseResult = (expenseId: string) => calculation.expenseResults.find((item) => item.id === expenseId);

  return (
    <main className="app-shell">
      <div className="animated-backdrop" aria-hidden="true">
        <div className="backdrop-grid" />
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />
        <div className="backdrop-glow" />
      </div>

      <header className="topbar glass-panel">
        <div className="brand-block">
          <div className="brand-mark">V</div>
          <div>
            <p>VOXE GROUP</p>
            <strong>Pricing Studio</strong>
          </div>
        </div>

        <div className="project-identity">
          <span>Project</span>
          <input
            aria-label="Project name"
            value={scenario.projectName}
            onChange={(event) => updateScenario({ projectName: event.target.value })}
          />
        </div>

        <div className="topbar-actions">
          <span className="local-badge"><ShieldCheck size={14} /> Local only</span>
          <div className="view-toggle" aria-label="View mode">
            <button className={view === "internal" ? "active" : ""} onClick={() => setView("internal")}>
              Internal
            </button>
            <button className={view === "client" ? "active" : ""} onClick={() => setView("client")}>
              Client
            </button>
          </div>
          {view === "client" && (
            <button className="button secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </button>
          )}
          <button className="button secondary" onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> Import
          </button>
          <button className="button primary" onClick={() => setBackupOpen(true)}>
            <ArrowDownToLine size={16} /> Export
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>
      </header>

      {view === "client" ? (
        <section className="client-sheet glass-panel">
          <div className="client-hero">
            <div>
              <p className="eyebrow">Project estimate</p>
              <h1>{scenario.projectName || "Untitled project"}</h1>
              <p>
                A structured delivery estimate covering {scenario.phases.length} phases, from kickoff through launch.
              </p>
            </div>
            <div className="client-price">
              <span>Estimated investment</span>
              <strong>{currencyFormat(scenario.currency, calculation.quote)}</strong>
              <small>Prepared by Voxe Group</small>
            </div>
          </div>

          <div className="client-metrics">
            <div><CalendarDays size={18} /><span>{calculation.totalWorkingDays} working days</span></div>
            <div><Clock3 size={18} /><span>{calculation.calendarDays} calendar days</span></div>
            <div><Sparkles size={18} /><span>{Math.round(calculation.totalHours)} delivery hours</span></div>
            <div><BriefcaseBusiness size={18} /><span>{friendlyDate(calculation.projectStart)} – {friendlyDate(calculation.projectEnd)}</span></div>
          </div>

          <div className="client-phase-list">
            <div className="client-phase-head"><span>Delivery phase</span><span>Timeline</span><span>Team</span></div>
            {scenario.phases.map((phase, index) => {
              const result = phaseResult(phase.id);
              return (
                <div className="client-phase" key={phase.id}>
                  <div><b>{String(index + 1).padStart(2, "0")}</b><strong>{phase.name}</strong></div>
                  <span>{phase.days} workdays<br /><small>{friendlyDate(result?.start ?? "")} – {friendlyDate(result?.end ?? "")}</small></span>
                  <div className="mini-avatar-stack">
                    {phase.assignments.map((assignment) => {
                      const person = workspace.people.find((item) => item.id === assignment.personId);
                      return person ? <i key={person.id} style={{ background: person.color }} title={person.role}>{initials(person.name)}</i> : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="client-footer">
            <span>Generated locally • Confidential estimate</span>
            <strong>Voxe Group</strong>
          </footer>
        </section>
      ) : (
        <>
          <section className="command-row">
            <div className="scenario-control glass-panel">
              <span>Scenario</span>
              <GlassSelect
                ariaLabel="Active scenario"
                className="scenario-select"
                value={workspace.activeScenarioId}
                options={workspace.scenarios.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(activeScenarioId) => setWorkspace((current) => ({ ...current, activeScenarioId }))}
              />
              <button className="icon-button" onClick={duplicateScenario} title="Duplicate scenario"><Copy size={16} /></button>
              <button
                className="icon-button danger"
                onClick={deleteScenario}
                disabled={workspace.scenarios.length <= 1}
                title="Delete scenario"
              ><Trash2 size={16} /></button>
            </div>
            <label className="scenario-name glass-panel">
              <span>Scenario name</span>
              <input value={scenario.name} onChange={(event) => updateScenario({ name: event.target.value })} />
            </label>
            <div className="autosave-status"><HardDrive size={14} /> {hydrated ? "Saved on this device" : "Loading draft"}</div>
          </section>

          <section className="metric-grid">
            <article className="metric-card glass-panel featured">
              <div className="metric-icon"><CircleDollarSign size={20} /></div>
              <div><span>Client quote</span><strong>{currencyFormat(scenario.currency, calculation.quote, true)}</strong><small>Rounded to {currencyFormat(scenario.currency, scenario.rounding)}</small></div>
              <TrendingUp size={18} className="metric-corner" />
            </article>
            <article className="metric-card glass-panel">
              <div className="metric-icon violet"><WalletCards size={20} /></div>
              <div><span>Estimated cost</span><strong>{currencyFormat(scenario.currency, calculation.estimatedCost, true)}</strong><small>{currencyFormat(scenario.currency, calculation.riskAdjustedCost)} with risk</small></div>
            </article>
            <article className="metric-card glass-panel">
              <div className="metric-icon green"><TrendingUp size={20} /></div>
              <div><span>Gross profit</span><strong className={calculation.grossProfit < 0 ? "negative" : "positive"}>{currencyFormat(scenario.currency, calculation.grossProfit, true)}</strong><small>{calculation.grossMargin.toFixed(1)}% gross margin</small></div>
            </article>
            <article className="metric-card glass-panel">
              <div className="metric-icon orange"><CalendarDays size={20} /></div>
              <div><span>Delivery</span><strong>{calculation.totalWorkingDays} days</strong><small>{friendlyDate(calculation.projectEnd)} • {Math.round(calculation.totalHours)}h</small></div>
            </article>
          </section>

          {calculation.warnings.length > 0 && (
            <section className="warning-strip glass-panel">
              <AlertTriangle size={18} />
              <div><strong>Pricing check</strong><span>{calculation.warnings.join(" ")}</span></div>
            </section>
          )}

          <section className="settings-card glass-panel">
            <div className="section-heading">
              <div><p className="eyebrow">01 • Foundation</p><h2>Project settings</h2></div>
              <span className="section-note"><Info size={14} /> Days create hours once. They never multiply the final quote again.</span>
            </div>
            <div className="settings-grid">
              <label className="field">
                <span>Currency</span>
                <GlassSelect
                  ariaLabel="Currency"
                  value={scenario.currency}
                  options={[
                    { value: "USD", label: "USD — US Dollar" },
                    { value: "IQD", label: "IQD — Iraqi Dinar" },
                    { value: "EUR", label: "EUR — Euro" },
                    { value: "GBP", label: "GBP — Pound" },
                  ]}
                  onChange={(currency) => updateScenario({ currency: currency as Currency })}
                />
              </label>
              <MoneyInput label="Client rate" value={scenario.clientRate} onChange={(clientRate) => updateScenario({ clientRate })} suffix="/ person-hour" min={0} />
              <MoneyInput label="Fixed starting fee" value={scenario.fixedFee} onChange={(fixedFee) => updateScenario({ fixedFee })} min={0} step={50} />
              <MoneyInput label="Default hours / day" value={scenario.defaultHours} onChange={(defaultHours) => updateScenario({ defaultHours })} suffix="hours" min={0} max={24} step={0.5} />
              <MoneyInput label="Target gross margin" value={scenario.targetMargin} onChange={(targetMargin) => updateScenario({ targetMargin })} suffix="%" min={0} max={95} />
              <MoneyInput label="Risk reserve" value={scenario.riskReserve} onChange={(riskReserve) => updateScenario({ riskReserve })} suffix="%" min={0} />
              <label className="field">
                <span>Rounding</span>
                <GlassSelect
                  ariaLabel="Quote rounding"
                  value={String(scenario.rounding)}
                  options={[1, 50, 100, 500, 1000, 100000].map((value) => ({ value: String(value), label: currencyFormat(scenario.currency, value) }))}
                  onChange={(rounding) => updateScenario({ rounding: numberValue(rounding) })}
                />
              </label>
              <label className="field">
                <span>Start date</span>
                <input type="date" value={scenario.startDate} onChange={(event) => updateScenario({ startDate: event.target.value })} />
              </label>
            </div>
            <div className="schedule-row">
              <div>
                <span className="mini-label">Working weekdays</span>
                <div className="day-selector">
                  {DAY_LABELS.map((label, day) => (
                    <button key={label} className={scenario.workingDays.includes(day) ? "active" : ""} onClick={() => toggleWorkingDay(day)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="holiday-box">
                <span className="mini-label">Excluded holidays</span>
                <div className="holiday-add">
                  <input type="date" value={holidayDraft} onChange={(event) => setHolidayDraft(event.target.value)} />
                  <button
                    className="icon-button"
                    aria-label="Add holiday"
                    onClick={() => {
                      if (!holidayDraft || scenario.holidays.includes(holidayDraft)) return;
                      updateScenario({ holidays: [...scenario.holidays, holidayDraft].sort() });
                      setHolidayDraft("");
                    }}
                  ><Plus size={16} /></button>
                </div>
                <div className="holiday-chips">
                  {scenario.holidays.map((holiday) => (
                    <button key={holiday} onClick={() => updateScenario({ holidays: scenario.holidays.filter((item) => item !== holiday) })}>{holiday}<X size={12} /></button>
                  ))}
                  {!scenario.holidays.length && <small>No excluded dates</small>}
                </div>
              </div>
            </div>
          </section>

          <section className="phases-card glass-panel">
            <div className="section-heading">
              <div><p className="eyebrow">02 • Delivery plan</p><h2>Phases & staffing</h2><p>Build the team and delivery plan together in one workspace.</p></div>
              <button className="button primary" onClick={addPhase}><Plus size={16} /> Add phase</button>
            </div>
            <div className="delivery-workspace">
              <aside className="people-sidebar" aria-label="People sidebar">
                <div className="dock-heading">
                  <div><p className="eyebrow">Talent pool</p><h3>People</h3></div>
                  <button className="icon-button accent" onClick={openNewPerson} aria-label="Add person"><Plus size={17} /></button>
                </div>
                <p className="dock-hint">Drag a person into a phase, or click a profile to edit it.</p>
                <div className="people-list">
                  {workspace.people.map((person) => (
                    <button
                      type="button"
                      key={person.id}
                      className={"person-card " + personTypeClass(person.type)}
                      style={{ "--person-color": person.color } as React.CSSProperties}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/x-voxe-person", person.id);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => { setEditingPerson(person); setIsNewPerson(false); }}
                    >
                      <span className="person-card-avatar">{initials(person.name)}</span>
                      <span className="person-card-copy"><strong>{person.name}</strong><small>{person.role}</small><em>{person.type}</em></span>
                      <GripVertical size={17} />
                    </button>
                  ))}
                  <button type="button" className="add-person-card" onClick={openNewPerson}><UserPlus size={18} /><span>Add someone</span></button>
                </div>
                <div className="dock-footer"><Users size={17} /><span>{workspace.people.length} people available</span></div>
              </aside>

              <div className="phase-workspace">
                <div className="phase-table">
              <div className="phase-table-head">
                <span>Phase</span><span>Schedule</span><span>Workdays</span><span>Assigned people</span><span>Hours</span><span>Cost</span><span />
              </div>
              {scenario.phases.map((phase, index) => {
                const result = phaseResult(phase.id);
                return (
                  <div
                    className={"phase-row " + (dragOverPhase === phase.id ? "drop-active" : "")}
                    key={phase.id}
                    onDragOver={(event) => { event.preventDefault(); setDragOverPhase(phase.id); }}
                    onDragLeave={() => setDragOverPhase(null)}
                    onDrop={(event) => handleDrop(event, phase.id)}
                  >
                    <div className="phase-name-cell"><GripVertical size={16} /><b>{String(index + 1).padStart(2, "0")}</b><input value={phase.name} onChange={(event) => updatePhase(phase.id, { name: event.target.value })} /></div>
                    <GlassSelect
                      ariaLabel={phase.name + " schedule"}
                      value={phase.schedule}
                      options={[
                        { value: "sequential", label: "After previous" },
                        { value: "parallel", label: "Alongside previous", disabled: index === 0 },
                      ]}
                      onChange={(schedule) => updatePhase(phase.id, { schedule: schedule as Phase["schedule"] })}
                    />
                    <NumberStepper compact ariaLabel={phase.name + " workdays"} value={phase.days} min={0} step={1} suffix="days" onChange={(days) => updatePhase(phase.id, { days })} />
                    <div className="assignment-zone">
                      {phase.assignments.map((assignment) => {
                        const person = workspace.people.find((item) => item.id === assignment.personId);
                        if (!person) return null;
                        return (
                          <div className="assignment-pill" key={person.id} title={person.name + " • " + person.role}>
                            <i style={{ background: person.color }}>{initials(person.name)}</i>
                            <NumberStepper
                              compact
                              ariaLabel={person.name + " hours per day"}
                              value={assignment.hoursPerDay}
                              min={0}
                              max={24}
                              step={0.5}
                              suffix="h/d"
                              onChange={(hoursPerDay) => updateAssignmentHours(phase.id, person.id, hoursPerDay)}
                            />
                            <button onClick={() => unassignPerson(phase.id, person.id)} aria-label={"Remove " + person.name}><X size={12} /></button>
                          </div>
                        );
                      })}
                      <button className="add-person-button" onClick={() => setPhasePickerId(phase.id)}><UserPlus size={15} /> Add</button>
                      {!phase.assignments.length && <small>Drop a person here</small>}
                    </div>
                    <strong>{Math.round(result?.adjustedHours ?? 0)}h</strong>
                    <strong>{currencyFormat(scenario.currency, result?.laborCost ?? 0)}</strong>
                    <button className="icon-button danger" onClick={() => removePhase(phase.id)} aria-label={"Remove " + phase.name}><Trash2 size={15} /></button>
                    <div className="phase-date"><CalendarDays size={13} /> {friendlyDate(result?.start ?? "")} → {friendlyDate(result?.end ?? "")}</div>
                  </div>
                );
              })}
              {!scenario.phases.length && <div className="empty-state"><CalendarDays size={24} /><strong>No delivery phases yet</strong><span>Add the first phase to begin the estimate.</span></div>}
                </div>
              </div>
            </div>
          </section>

          <section className="detail-grid">
            <article className="detail-card glass-panel">
              <div className="section-heading compact"><div><p className="eyebrow">03 • Cost layer</p><h2>Expenses</h2></div><button className="icon-button accent" onClick={addExpense}><Plus size={17} /></button></div>
              <div className="data-list">
                {scenario.expenses.map((expense) => {
                  const result = expenseResult(expense.id);
                  return (
                    <div className="data-row expense-row" key={expense.id}>
                      <input className="row-name" value={expense.name} onChange={(event) => updateExpense(expense.id, { name: event.target.value })} />
                      <NumberStepper compact ariaLabel={expense.name + " amount"} value={expense.amount} min={0} step={1} suffix={scenario.currency} onChange={(amount) => updateExpense(expense.id, { amount })} />
                      <GlassSelect ariaLabel={expense.name + " unit"} value={expense.unit} options={Object.entries(unitLabels).map(([value, label]) => ({ value, label }))} onChange={(unit) => updateExpense(expense.id, { unit: unit as ExpenseUnit })} />
                      <GlassSelect ariaLabel={expense.name + " billing"} value={expense.billing} options={Object.entries(billingLabels).map(([value, label]) => ({ value, label }))} onChange={(billing) => updateExpense(expense.id, { billing: billing as ExpenseBilling })} />
                      {expense.billing === "markup" && <NumberStepper compact ariaLabel={expense.name + " markup"} value={expense.markup} min={0} step={1} suffix="%" onChange={(markup) => updateExpense(expense.id, { markup })} />}
                      <strong>{currencyFormat(scenario.currency, result?.cost ?? 0)}</strong>
                      <button className="icon-button danger" onClick={() => updateScenario({ expenses: scenario.expenses.filter((item) => item.id !== expense.id) })}><Trash2 size={14} /></button>
                    </div>
                  );
                })}
                {!scenario.expenses.length && <div className="empty-inline">No additional expenses</div>}
              </div>
            </article>

            <article className="detail-card glass-panel">
              <div className="section-heading compact"><div><p className="eyebrow">04 • Adjustments</p><h2>Modifiers</h2></div><button className="icon-button accent" onClick={addModifier}><Plus size={17} /></button></div>
              <div className="data-list">
                {scenario.modifiers.map((modifier) => (
                  <div className="data-row modifier-row" key={modifier.id}>
                    <input className="row-name" value={modifier.name} onChange={(event) => updateModifier(modifier.id, { name: event.target.value })} />
                    <GlassSelect ariaLabel={modifier.name + " target"} value={modifier.target} options={[{ value: "price", label: "Price" }, { value: "effort", label: "Effort" }]} onChange={(target) => updateModifier(modifier.id, { target: target as ModifierTarget })} />
                    <GlassSelect ariaLabel={modifier.name + " type"} value={modifier.kind} options={[{ value: "percentage", label: "Percent" }, { value: "fixed", label: "Fixed " + (modifier.target === "effort" ? "hours" : scenario.currency) }]} onChange={(kind) => updateModifier(modifier.id, { kind: kind as ModifierKind })} />
                    <NumberStepper compact ariaLabel={modifier.name + " value"} value={modifier.value} step={1} suffix={modifier.kind === "percentage" ? "%" : modifier.target === "effort" ? "h" : scenario.currency} onChange={(value) => updateModifier(modifier.id, { value })} />
                    <button className="icon-button danger" onClick={() => updateScenario({ modifiers: scenario.modifiers.filter((item) => item.id !== modifier.id) })}><Trash2 size={14} /></button>
                  </div>
                ))}
                {!scenario.modifiers.length && <div className="empty-inline">No price or effort modifiers</div>}
              </div>
            </article>
          </section>

          <section className="financial-card glass-panel">
            <div className="section-heading"><div><p className="eyebrow">05 • Decision</p><h2>Financial pulse</h2><p>The safe price uses estimated cost, the risk reserve, and your target gross margin.</p></div><span className={"safety-badge " + (calculation.quote >= calculation.safePrice ? "safe" : "unsafe")}>{calculation.quote >= calculation.safePrice ? <Check size={15} /> : <AlertTriangle size={15} />}{calculation.quote >= calculation.safePrice ? "Target protected" : "Below target"}</span></div>
            <div className="financial-layout">
              <div className="breakdown-list">
                <div><span>Base billable amount</span><strong>{currencyFormat(scenario.currency, calculation.baseRevenue)}</strong></div>
                <div><span>Price modifiers</span><strong>{currencyFormat(scenario.currency, calculation.modifierRevenue)}</strong></div>
                <div><span>Client-billable expenses</span><strong>{currencyFormat(scenario.currency, calculation.billableExpenses)}</strong></div>
                <div><span>Manual adjustment</span><strong>{currencyFormat(scenario.currency, scenario.manualAdjustment)}</strong></div>
                <div className="total"><span>Final rounded quote</span><strong>{currencyFormat(scenario.currency, calculation.quote)}</strong></div>
              </div>
              <div className="margin-visual">
                <div className="margin-ring" style={{ "--margin": Math.max(0, Math.min(100, calculation.guardedMargin)) + "%" } as React.CSSProperties}><div><strong>{calculation.guardedMargin.toFixed(1)}%</strong><span>guarded margin</span></div></div>
                <div><span>Minimum safe price</span><strong>{currencyFormat(scenario.currency, calculation.safePrice)}</strong><small>{currencyFormat(scenario.currency, calculation.guardedProfit)} protected profit</small></div>
              </div>
              <div className="adjustment-panel">
                <MoneyInput label="Manual price adjustment" value={scenario.manualAdjustment} onChange={(manualAdjustment) => updateScenario({ manualAdjustment })} suffix={scenario.currency} step={50} />
                <label className="field"><span>Reason</span><input placeholder="Required for internal traceability" value={scenario.adjustmentReason} onChange={(event) => updateScenario({ adjustmentReason: event.target.value })} /></label>
                <div className="formula-note"><LockKeyhole size={15} /><span>Internal costs never appear in Client view or its printout.</span></div>
              </div>
            </div>
          </section>
        </>
      )}

      {editingPerson && (
        <Modal title={isNewPerson ? "Add someone" : "Edit profile"} subtitle="Personal and professional details stay on this device." onClose={() => setEditingPerson(null)} wide>
          <form onSubmit={savePerson}>
            <div className="person-editor-top">
              <div className="editor-avatar" style={{ background: editingPerson.color }}>{initials(editingPerson.name)}</div>
              <div className="color-picker">
                <span>Profile color</span>
                <div>{COLORS.map((color) => <button type="button" key={color} style={{ background: color }} className={editingPerson.color === color ? "active" : ""} onClick={() => setEditingPerson({ ...editingPerson, color })}>{editingPerson.color === color && <Check size={12} />}</button>)}</div>
              </div>
            </div>
            <div className="form-grid">
              <label className="field"><span>Full name *</span><input required value={editingPerson.name} onChange={(event) => setEditingPerson({ ...editingPerson, name: event.target.value })} /></label>
              <label className="field"><span>Relationship</span><GlassSelect ariaLabel="Relationship" value={editingPerson.type} options={["Employee", "Intern", "Contractor", "Freelancer", "Advisor"].map((type) => ({ value: type, label: type }))} onChange={(type) => setEditingPerson({ ...editingPerson, type: type as PersonType })} /></label>
              <label className="field"><span>Role *</span><input required value={editingPerson.role} onChange={(event) => setEditingPerson({ ...editingPerson, role: event.target.value })} /></label>
              <label className="field"><span>Department</span><input value={editingPerson.department} onChange={(event) => setEditingPerson({ ...editingPerson, department: event.target.value })} /></label>
              <MoneyInput label="Internal hourly cost" value={editingPerson.hourlyCost} onChange={(hourlyCost) => setEditingPerson({ ...editingPerson, hourlyCost })} suffix={scenario.currency + "/h"} min={0} />
              <MoneyInput label="Default hours / day" value={editingPerson.defaultHours} onChange={(defaultHours) => setEditingPerson({ ...editingPerson, defaultHours })} suffix="hours" min={0} max={24} step={0.5} />
              <label className="field"><span>Email</span><input type="email" value={editingPerson.email} onChange={(event) => setEditingPerson({ ...editingPerson, email: event.target.value })} /></label>
              <label className="field"><span>Phone</span><input value={editingPerson.phone} onChange={(event) => setEditingPerson({ ...editingPerson, phone: event.target.value })} /></label>
              <label className="field"><span>Location</span><input value={editingPerson.location} onChange={(event) => setEditingPerson({ ...editingPerson, location: event.target.value })} /></label>
              <label className="field"><span>Skills</span><input placeholder="Comma-separated" value={editingPerson.skills} onChange={(event) => setEditingPerson({ ...editingPerson, skills: event.target.value })} /></label>
              <label className="field full"><span>Internal notes</span><textarea rows={3} value={editingPerson.notes} onChange={(event) => setEditingPerson({ ...editingPerson, notes: event.target.value })} /></label>
            </div>
            <div className="modal-actions">
              {!isNewPerson && <button type="button" className="button danger-button" onClick={deletePerson}><Trash2 size={15} /> Remove person</button>}
              <span />
              <button type="button" className="button secondary" onClick={() => setEditingPerson(null)}>Cancel</button>
              <button type="submit" className="button primary"><Check size={16} /> {isNewPerson ? "Add to people" : "Save profile"}</button>
            </div>
          </form>
        </Modal>
      )}

      {phasePickerId && (
        <Modal title="Assign someone" subtitle="Choose anyone from your shared talent pool." onClose={() => setPhasePickerId(null)}>
          <div className="person-picker">
            {workspace.people.map((person) => {
              const phase = scenario.phases.find((item) => item.id === phasePickerId);
              const assigned = phase?.assignments.some((assignment) => assignment.personId === person.id);
              return (
                <button key={person.id} disabled={assigned} onClick={() => assignPerson(phasePickerId, person.id)}>
                  <i style={{ background: person.color }}>{initials(person.name)}</i>
                  <div><strong>{person.name}</strong><span>{person.role} • {person.type}</span></div>
                  {assigned ? <Check size={16} /> : <Plus size={16} />}
                </button>
              );
            })}
            <button className="new-person-picker" onClick={() => { setPhasePickerId(null); openNewPerson(); }}><UserPlus size={17} /> Add a new employee, intern or contractor</button>
          </div>
        </Modal>
      )}

      {backupOpen && (
        <Modal title="Export workspace" subtitle="Encrypted export protects rates, costs, profiles and project history." onClose={() => setBackupOpen(false)}>
          <div className="backup-options">
            <div className="secure-export"><div className="backup-icon"><LockKeyhole size={22} /></div><div><strong>Encrypted backup</strong><span>Recommended for confidential pricing data.</span></div></div>
            <label className="field"><span>Backup password</span><input type="password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="At least 8 characters" /></label>
            <button className="button primary full-button" onClick={exportEncrypted}><FileDown size={16} /> Download encrypted file</button>
            <div className="backup-divider"><span>or</span></div>
            <button className="button secondary full-button" onClick={exportPlain}><ArrowDownToLine size={16} /> Export plain JSON</button>
            <p className="plain-warning"><AlertTriangle size={14} /> Plain JSON can be read by anyone who receives the file.</p>
          </div>
        </Modal>
      )}

      {pendingImport && (
        <Modal title="Unlock encrypted backup" subtitle="Enter the password used when this workspace was exported." onClose={() => setPendingImport(null)}>
          <div className="backup-options"><label className="field"><span>Backup password</span><input autoFocus type="password" value={importPassword} onChange={(event) => setImportPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlockImport(); }} /></label><button className="button primary full-button" onClick={unlockImport}><LockKeyhole size={16} /> Unlock and import</button></div>
        </Modal>
      )}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}
