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
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  FileDown,
  GripVertical,
  Info,
  LockKeyhole,
  Minus,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

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

type ProjectPlan = {
  projectName: string;
  currency: Currency;
  startDate: string;
  baseHourlyPrice: number;
  fixedFee: number;
  defaultHours: number;
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
  schemaVersion: 3;
  people: Person[];
  project: ProjectPlan;
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
const PLANNING_MODE_KEY = "voxe-pricing-planning-mode-v1";
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

  return {
    app: "voxe-pricing-studio",
    schemaVersion: 3,
    people: [designer, developer, qa, aiContractor],
    project: {
        projectName: "Customer Operations Platform",
        currency: "USD",
        startDate: "2026-08-09",
        baseHourlyPrice: 55,
        fixedFee: 1500,
        defaultHours: 6,
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
  };
};

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

const calendarDateFromString = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
};

const calendarMonthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const calendarDateFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const currencyFormat = (currency: Currency, value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: currency === "IQD" ? 0 : 2,
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

function calculateScenario(scenario: ProjectPlan, people: Person[]) {
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
      revenue: adjustedHours * scenario.baseHourlyPrice,
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
  const baseRevenue = Math.max(0, scenario.fixedFee + totalHours * scenario.baseHourlyPrice);
  const pricePercent = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "percentage")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const fixedPriceModifiers = scenario.modifiers
    .filter((modifier) => modifier.target === "price" && modifier.kind === "fixed")
    .reduce((sum, modifier) => sum + modifier.value, 0);
  const modifierRevenue = baseRevenue * (pricePercent / 100) + fixedPriceModifiers;
  const quote = Math.max(
    0,
    baseRevenue + modifierRevenue + billableExpenses + scenario.manualAdjustment,
  );
  const estimatedCost = laborCost + expenseCost;
  const grossProfit = quote - estimatedCost;
  const grossMargin = quote > 0 ? (grossProfit / quote) * 100 : 0;

  const planningWarnings: string[] = [];
  const pricingWarnings: string[] = [];
  if (!scenario.workingDays.length) planningWarnings.push("Select at least one working weekday.");
  if (!scenario.phases.length) planningWarnings.push("Add at least one delivery phase.");
  if (scenario.phases.some((phase) => !phase.assignments.length)) planningWarnings.push("One or more phases have no people assigned.");
  if (scenario.phases.some((phase) => phase.assignments.some((assignment) => assignment.hoursPerDay > 24))) {
    planningWarnings.push("An assignment exceeds 24 hours per day.");
  }
  if (grossProfit < 0) pricingWarnings.push("The quote is below estimated project cost.");

  return {
    rawHours,
    totalHours,
    laborCost,
    expenseCost,
    estimatedCost,
    billableExpenses,
    baseRevenue,
    modifierRevenue,
    quote,
    grossProfit,
    grossMargin,
    totalWorkingDays,
    calendarDays,
    projectStart,
    projectEnd,
    phaseResults,
    expenseResults,
    planningWarnings,
    pricingWarnings,
    warnings: [...planningWarnings, ...pricingWarnings],
  };
}

const isProjectPlan = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.projectName === "string" &&
    typeof candidate.startDate === "string" &&
    typeof candidate.currency === "string" &&
    Array.isArray(candidate.workingDays) &&
    Array.isArray(candidate.holidays) &&
    Array.isArray(candidate.phases) &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.modifiers)
  );
};

const normalizeProjectPlan = (value: unknown): ProjectPlan | null => {
  if (!isProjectPlan(value)) return null;
  const project = { ...value };
  const baseHourlyPrice = typeof project.baseHourlyPrice === "number"
    ? project.baseHourlyPrice
    : typeof project.clientRate === "number"
      ? project.clientRate
      : 0;

  project.baseHourlyPrice = Number.isFinite(baseHourlyPrice) ? baseHourlyPrice : 0;
  delete project.clientRate;
  delete project.targetMargin;
  delete project.riskReserve;
  delete project.rounding;
  delete project.id;
  delete project.name;

  return project as unknown as ProjectPlan;
};

const normalizeWorkspace = (value: unknown): Workspace | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    app?: unknown;
    people?: unknown;
    project?: unknown;
    activeScenarioId?: unknown;
    scenarios?: unknown;
  };
  if (candidate.app !== "voxe-pricing-studio" || !Array.isArray(candidate.people)) return null;

  let project = normalizeProjectPlan(candidate.project);
  if (!project) {
    if (!Array.isArray(candidate.scenarios) || !candidate.scenarios.length) return null;
    const activeProject = candidate.scenarios.find((item) => (
      item &&
      typeof item === "object" &&
      "id" in item &&
      item.id === candidate.activeScenarioId
    )) ?? candidate.scenarios[0];
    project = normalizeProjectPlan(activeProject);
  }
  if (!project) return null;

  return {
    app: "voxe-pricing-studio",
    schemaVersion: 3,
    people: candidate.people as Person[],
    project,
  };
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

function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["157, 126, 255", "61, 218, 199", "226, 91, 210"];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let reducedMotion = motionPreference.matches;
    let pointerX = -1000;
    let pointerY = -1000;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      phase: number;
    }> = [];
    let comets: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      thickness: number;
      color: string;
    }> = [];

    const createParticles = () => {
      const count = Math.min(88, Math.max(38, Math.floor((width * height) / 22000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.44,
        vy: (Math.random() - 0.5) * 0.38,
        radius: 0.8 + Math.random() * 1.7,
        color: colors[index % colors.length],
        phase: Math.random() * Math.PI * 2,
      }));
      comets = Array.from({ length: 4 }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 1.05 + Math.random() * 1.1,
        vy: (Math.random() - 0.5) * 0.5,
        length: 75 + Math.random() * 105,
        thickness: 0.7 + Math.random() * 0.8,
        color: colors[index % colors.length],
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createParticles();
    };

    const drawRibbon = (
      time: number,
      baseY: number,
      amplitude: number,
      speed: number,
      color: string,
      offset: number,
    ) => {
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(" + color + ", 0)");
      gradient.addColorStop(0.22, "rgba(" + color + ", 0.08)");
      gradient.addColorStop(0.55, "rgba(" + color + ", 0.18)");
      gradient.addColorStop(0.82, "rgba(" + color + ", 0.07)");
      gradient.addColorStop(1, "rgba(" + color + ", 0)");

      context.beginPath();
      for (let x = -40; x <= width + 40; x += 24) {
        const y = baseY
          + Math.sin(x * 0.0045 + time * speed + offset) * amplitude
          + Math.sin(x * 0.009 - time * speed * 0.7 + offset) * amplitude * 0.34;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(28, Math.min(58, width * 0.035));
      context.shadowBlur = 42;
      context.shadowColor = "rgba(" + color + ", 0.2)";
      context.stroke();
      context.shadowBlur = 0;
    };

    const draw = (timestamp: number) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      drawRibbon(time, height * 0.24, height * 0.065, 0.34, colors[0], 0.4);
      drawRibbon(time, height * 0.58, height * 0.085, -0.28, colors[1], 2.1);
      drawRibbon(time, height * 0.83, height * 0.055, 0.25, colors[2], 4.2);

      if (pointerX > -500) {
        const pointerGlow = context.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 145);
        pointerGlow.addColorStop(0, "rgba(149, 119, 255, 0.07)");
        pointerGlow.addColorStop(0.5, "rgba(65, 214, 198, 0.025)");
        pointerGlow.addColorStop(1, "rgba(65, 214, 198, 0)");
        context.beginPath();
        context.arc(pointerX, pointerY, 145, 0, Math.PI * 2);
        context.fillStyle = pointerGlow;
        context.fill();
      }

      comets.forEach((comet) => {
        if (!reducedMotion) {
          comet.x += comet.vx;
          comet.y += comet.vy;
          if (comet.x - comet.length > width || comet.y < -80 || comet.y > height + 80) {
            comet.x = -comet.length - Math.random() * width * 0.3;
            comet.y = Math.random() * height;
            comet.vx = 1.05 + Math.random() * 1.1;
            comet.vy = (Math.random() - 0.5) * 0.5;
          }
        }

        const tailX = comet.x - comet.vx * comet.length;
        const tailY = comet.y - comet.vy * comet.length;
        const trail = context.createLinearGradient(tailX, tailY, comet.x, comet.y);
        trail.addColorStop(0, "rgba(" + comet.color + ", 0)");
        trail.addColorStop(0.72, "rgba(" + comet.color + ", 0.12)");
        trail.addColorStop(1, "rgba(" + comet.color + ", 0.68)");
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(comet.x, comet.y);
        context.strokeStyle = trail;
        context.lineWidth = comet.thickness;
        context.shadowBlur = 12;
        context.shadowColor = "rgba(" + comet.color + ", 0.45)";
        context.stroke();
        context.shadowBlur = 0;
      });

      particles.forEach((particle, index) => {
        if (!reducedMotion) {
          particle.x += particle.vx + Math.sin(time * 0.76 + particle.phase) * 0.075;
          particle.y += particle.vy + Math.cos(time * 0.66 + particle.phase) * 0.065;

          const pointerDistanceX = pointerX - particle.x;
          const pointerDistanceY = pointerY - particle.y;
          const pointerDistance = Math.hypot(pointerDistanceX, pointerDistanceY);
          if (pointerDistance < 190 && pointerDistance > 1) {
            const influence = (1 - pointerDistance / 190) * 0.006;
            particle.x += pointerDistanceX * influence;
            particle.y += pointerDistanceY * influence;
          }

          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const distance = Math.hypot(next.x - particle.x, next.y - particle.y);
          if (distance > 160) continue;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = "rgba(150, 132, 220, " + ((1 - distance / 160) * 0.16) + ")";
          context.lineWidth = 0.65;
          context.stroke();
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + particle.color + ", 0.68)";
        context.shadowBlur = 13;
        context.shadowColor = "rgba(" + particle.color + ", 0.58)";
        context.fill();
        context.shadowBlur = 0;

        if (index % 9 === 0) {
          const pulse = (time * 0.72 + particle.phase / (Math.PI * 2)) % 1;
          context.beginPath();
          context.arc(particle.x, particle.y, 8 + pulse * 26, 0, Math.PI * 2);
          context.strokeStyle = "rgba(" + particle.color + ", " + ((1 - pulse) * 0.16) + ")";
          context.lineWidth = 0.8;
          context.stroke();
        }
      });

      context.globalCompositeOperation = "source-over";
      if (!reducedMotion && !document.hidden) animationFrame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(draw);
    };
    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const handlePointerLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const handleVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(animationFrame);
      else start();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="live-background-canvas" aria-hidden="true" />;
}

type GlowWaypoint = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

const glowTransform = (waypoint: GlowWaypoint) =>
  `translate3d(${waypoint.x}vw, ${waypoint.y}vh, 0) scale(${waypoint.scale})`;

function RandomAmbientGlows() {
  const glowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Array<Animation | undefined> = [];
    const timers: Array<number | undefined> = [];
    let disposed = false;

    const randomWaypoint = (): GlowWaypoint => ({
      x: -4 + Math.random() * 104,
      y: -6 + Math.random() * 104,
      scale: 0.82 + Math.random() * 0.38,
      opacity: 0.22 + Math.random() * 0.13,
    });

    const placeGlow = (element: HTMLDivElement, waypoint: GlowWaypoint) => {
      element.style.transform = glowTransform(waypoint);
      element.style.opacity = String(waypoint.opacity);
    };

    const stopMotion = () => {
      timers.forEach((timer, index) => {
        if (timer !== undefined) window.clearTimeout(timer);
        timers[index] = undefined;
      });
      animations.forEach((animation, index) => {
        if (animation) {
          animation.onfinish = null;
          animation.cancel();
        }
        animations[index] = undefined;
      });
    };

    const travel = (element: HTMLDivElement, index: number, current: GlowWaypoint) => {
      if (disposed || motionPreference.matches) return;

      let next = randomWaypoint();
      let distance = Math.hypot(next.x - current.x, next.y - current.y);
      for (let attempt = 0; attempt < 4 && distance < 26; attempt += 1) {
        next = randomWaypoint();
        distance = Math.hypot(next.x - current.x, next.y - current.y);
      }

      const duration = Math.max(2200, Math.min(6200, distance * (55 + Math.random() * 20)));
      const animation = element.animate(
        [
          { transform: glowTransform(current), opacity: current.opacity },
          { transform: glowTransform(next), opacity: next.opacity },
        ],
        {
          duration,
          easing: "cubic-bezier(0.42, 0, 0.25, 1)",
          fill: "forwards",
        },
      );
      animations[index] = animation;

      animation.onfinish = () => {
        if (disposed) return;
        placeGlow(element, next);
        animation.cancel();
        animations[index] = undefined;
        timers[index] = window.setTimeout(
          () => travel(element, index, next),
          60 + Math.random() * 300,
        );
      };
    };

    const startMotion = () => {
      stopMotion();
      glowRefs.current.forEach((element, index) => {
        if (!element) return;
        const initial = randomWaypoint();
        placeGlow(element, initial);
        if (!motionPreference.matches) {
          timers[index] = window.setTimeout(
            () => travel(element, index, initial),
            80 + index * 110 + Math.random() * 240,
          );
        }
      });
    };

    const handleMotionPreference = () => startMotion();
    startMotion();
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      disposed = true;
      stopMotion();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  const glowNames = ["one", "two", "three", "four", "five"];
  return (
    <>
      {glowNames.map((name, index) => (
        <div
          key={name}
          ref={(element) => {
            glowRefs.current[index] = element;
          }}
          className={`ambient ambient-${name}`}
        />
      ))}
    </>
  );
}

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

function GlassDatePicker({
  value,
  onChange,
  ariaLabel,
  clearable = false,
  min,
  max,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  clearable?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
  const selectedDate = calendarDateFromString(value);
  const [open, setOpen] = useState(false);
  const [calendarStyle, setCalendarStyle] = useState<React.CSSProperties>({});
  const [viewMonth, setViewMonth] = useState(() => {
    const initial = selectedDate ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const selectedKey = selectedDate ? dateKey(selectedDate) : "";
  const today = new Date();
  const todayKey = dateKey(today);
  const minDate = min ? calendarDateFromString(min) : null;
  const maxDate = max ? calendarDateFromString(max) : null;

  const calendarDays = useMemo(() => {
    const firstVisibleDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - viewMonth.getDay(), 12);
    return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDate, index));
  }, [viewMonth]);

  const positionCalendar = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 8;
    const width = Math.min(340, window.innerWidth - viewportPadding * 2);
    const estimatedHeight = Math.min(390, window.innerHeight - viewportPadding * 2);
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const top = availableBelow >= estimatedHeight
      ? rect.bottom + gap
      : availableAbove >= estimatedHeight
        ? Math.max(viewportPadding, rect.top - estimatedHeight - gap)
        : Math.max(viewportPadding, Math.min(rect.bottom + gap, window.innerHeight - estimatedHeight - viewportPadding));
    setCalendarStyle({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding)),
      top,
      width,
      maxHeight: window.innerHeight - viewportPadding * 2,
    });
  }, []);

  const openCalendar = () => {
    if (disabled) return;
    const initial = selectedDate ?? new Date();
    setViewMonth(new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
    positionCalendar();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !calendarRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePosition = () => positionCalendar();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handlePosition);
    window.addEventListener("scroll", handlePosition, true);
    window.requestAnimationFrame(() => {
      calendarRef.current?.querySelector<HTMLButtonElement>(
        '.glass-calendar-day[aria-pressed="true"], .glass-calendar-day[aria-current="date"], .glass-calendar-day:not(.outside-month)',
      )?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handlePosition);
      window.removeEventListener("scroll", handlePosition, true);
    };
  }, [open, positionCalendar]);

  const chooseDate = (date: Date) => {
    onChange(dateKey(date));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusCalendarDate = (date: Date) => {
    if (date.getMonth() !== viewMonth.getMonth() || date.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
    window.requestAnimationFrame(() => {
      calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(date)}"]`)?.focus();
    });
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let nextDate: Date | null = null;
    if (event.key === "ArrowLeft") nextDate = addDays(date, -1);
    if (event.key === "ArrowRight") nextDate = addDays(date, 1);
    if (event.key === "ArrowUp") nextDate = addDays(date, -7);
    if (event.key === "ArrowDown") nextDate = addDays(date, 7);
    if (event.key === "Home") nextDate = addDays(date, -date.getDay());
    if (event.key === "End") nextDate = addDays(date, 6 - date.getDay());
    if (event.key === "PageUp" || event.key === "PageDown") {
      const monthDelta = event.key === "PageUp" ? -1 : 1;
      const targetMonth = new Date(date.getFullYear(), date.getMonth() + monthDelta, 1, 12);
      const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 12).getDate();
      nextDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), lastDay), 12);
    }
    if (!nextDate) return;
    event.preventDefault();
    if ((minDate && nextDate < minDate) || (maxDate && nextDate > maxDate)) return;
    focusCalendarDate(nextDate);
  };

  const calendar = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id={calendarId}
          ref={calendarRef}
          className="glass-date-menu"
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          style={calendarStyle}
          onBlur={() => window.requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!calendarRef.current?.contains(active) && active !== triggerRef.current) setOpen(false);
          })}
        >
          <div className="glass-calendar-header">
            <button
              type="button"
              className="calendar-nav-button"
              aria-label="Previous month"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1, 12))}
            >
              <ChevronLeft size={17} />
            </button>
            <strong aria-live="polite">{calendarMonthFormat.format(viewMonth)}</strong>
            <button
              type="button"
              className="calendar-nav-button"
              aria-label="Next month"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1, 12))}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="glass-calendar-weekdays" aria-hidden="true">
            {DAY_LABELS.map((day) => <span key={day}>{day.slice(0, 2)}</span>)}
          </div>
          <div className="glass-calendar-grid" aria-label={calendarMonthFormat.format(viewMonth)}>
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const outsideMonth = date.getMonth() !== viewMonth.getMonth();
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const isDisabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
              return (
                <button
                  type="button"
                  key={key}
                  data-date={key}
                  className={`glass-calendar-day${outsideMonth ? " outside-month" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                  aria-label={calendarDateFormat.format(date)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  disabled={isDisabled}
                  tabIndex={isSelected || (!selectedKey && isToday) || (!selectedKey && !calendarDays.some((item) => dateKey(item) === todayKey) && !outsideMonth && date.getDate() === 1) ? 0 : -1}
                  onClick={() => chooseDate(date)}
                  onKeyDown={(event) => handleDayKeyDown(event, date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="glass-calendar-footer">
            <button type="button" onClick={() => chooseDate(new Date())}>Today</button>
            {clearable && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="glass-select-trigger glass-date-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-controls={calendarId}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openCalendar()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openCalendar();
          }
        }}
      >
        <span className={selectedDate ? "" : "placeholder"}>{selectedDate ? friendlyDate(value) : "Select date"}</span>
        <CalendarDays size={16} />
      </button>
      {calendar}
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
  const [planningMode, setPlanningMode] = useState(true);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [phasePickerId, setPhasePickerId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [revealPricingOpen, setRevealPricingOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [holidayDraft, setHolidayDraft] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const scenario = workspace.project;
  const calculation = useMemo(
    () => calculateScenario(scenario, workspace.people),
    [scenario, workspace.people],
  );
  const assignedPeopleCount = useMemo(
    () => new Set(scenario.phases.flatMap((phase) => phase.assignments.map((assignment) => assignment.personId))).size,
    [scenario.phases],
  );
  const visibleWarnings = planningMode ? calculation.planningWarnings : calculation.warnings;
  const visibleModifiers = planningMode
    ? scenario.modifiers.filter((modifier) => modifier.target === "effort")
    : scenario.modifiers;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setPlanningMode(localStorage.getItem(PLANNING_MODE_KEY) === "true");
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          const normalized = normalizeWorkspace(parsed);
          if (normalized) setWorkspace(normalized);
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
    if (!hydrated) return;
    localStorage.setItem(PLANNING_MODE_KEY, String(planningMode));
  }, [planningMode, hydrated]);

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

  const updateScenario = (patch: Partial<ProjectPlan>) => {
    setWorkspace((current) => ({
      ...current,
      project: { ...current.project, ...patch },
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
      project: {
        ...current.project,
        phases: current.project.phases.map((phase) => ({
          ...phase,
          assignments: phase.assignments.filter((assignment) => assignment.personId !== personId),
        })),
      },
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
        { id: uid(), name: planningMode ? "New effort adjustment" : "New modifier", kind: "percentage", target: planningMode ? "effort" : "price", value: 0 },
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

  const downloadProject = () => {
    if (planningMode) {
      setToast("Turn off planning mode to export pricing data");
      return;
    }
    downloadJson(workspace, safeFilename(scenario.projectName) + ".voxe.json");
    setExportOpen(false);
    setToast("Project file downloaded");
  };

  const printClientEstimate = () => {
    setExportOpen(false);
    setView("client");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  const togglePlanningMode = () => {
    if (planningMode) {
      setExportOpen(false);
      setRevealPricingOpen(true);
      return;
    }
    setPlanningMode(true);
    setExportOpen(false);
    setToast("Planning mode on — pricing hidden");
  };

  const revealPricing = () => {
    setPlanningMode(false);
    setRevealPricingOpen(false);
    setToast("Planning mode off — pricing restored");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const normalized = normalizeWorkspace(parsed);
      if (!normalized) throw new Error("Invalid workspace");
      setWorkspace(normalized);
      setToast(planningMode ? "Workspace imported — pricing remains hidden" : "Workspace imported");
    } catch {
      setToast("That file is not a valid Voxe workspace");
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
    <main className={"app-shell " + (planningMode ? "planning-mode" : "pricing-mode")}>
      <div className="animated-backdrop" aria-hidden="true">
        <div className="backdrop-grid" />
        <LiveBackground />
        <RandomAmbientGlows />
        <div className="backdrop-glow" />
      </div>

      <header className="topbar glass-panel">
        <div className="nav-brand" aria-label="Voxe Group">
          <div className="brand-mark" aria-hidden="true">V</div>
          <div className="brand-wordmark"><strong>VOXE</strong><span>GROUP</span></div>
        </div>

        <label className="project-identity">
          <span className="project-identity-icon"><BriefcaseBusiness size={17} /></span>
          <span className="project-identity-copy">
            <small>Current project</small>
            <input
              aria-label="Project name"
              value={scenario.projectName}
              onChange={(event) => updateScenario({ projectName: event.target.value })}
            />
          </span>
        </label>

        <div className="topbar-actions">
          <div className="mode-controls">
            <button
              type="button"
              className={"privacy-switch " + (planningMode ? "active" : "")}
              role="switch"
              aria-checked={planningMode}
              aria-label={planningMode ? "Turn off planning mode and show pricing" : "Turn on planning mode and hide pricing"}
              onClick={togglePlanningMode}
            >
              <span className="privacy-switch-icon">{planningMode ? <EyeOff size={15} /> : <Eye size={15} />}</span>
              <span className="privacy-switch-copy"><strong>Planning mode</strong><small>{planningMode ? "Pricing hidden" : "Pricing visible"}</small></span>
              <span className="privacy-switch-track" aria-hidden="true" />
            </button>
            <div className="view-toggle" data-view={view} role="group" aria-label="Interface view">
              <button type="button" aria-pressed={view === "internal"} className={view === "internal" ? "active" : ""} onClick={() => setView("internal")}>
                Internal
              </button>
              <button type="button" aria-pressed={view === "client"} className={view === "client" ? "active" : ""} onClick={() => setView("client")}>
                Client
              </button>
            </div>
          </div>
          <span className="nav-divider" aria-hidden="true" />
          <div className="file-actions">
            <button type="button" className="button secondary topbar-import" onClick={() => fileInput.current?.click()}>
              <Upload size={16} /> Import
            </button>
            <button type="button" className="button primary topbar-export" onClick={() => setExportOpen(true)}>
              <ArrowDownToLine size={16} /> Export
            </button>
          </div>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>
      </header>

      {view === "client" ? (
        <section className={"client-sheet glass-panel " + (planningMode ? "planning-sheet" : "")}>
          <div className={"client-hero " + (planningMode ? "planning" : "")}>
            <div>
              <p className="eyebrow">{planningMode ? "Team planning brief" : "Project estimate"}</p>
              <h1>{scenario.projectName || "Untitled project"}</h1>
              <p>
                A structured delivery {planningMode ? "plan" : "estimate"} covering {scenario.phases.length} phases, from kickoff through launch.
              </p>
            </div>
            {!planningMode && (
              <div className="client-price">
                <span>Estimated investment</span>
                <strong>{currencyFormat(scenario.currency, calculation.quote)}</strong>
                <small>Prepared by Voxe Group</small>
              </div>
            )}
          </div>

          {planningMode && <div className="planning-print-note"><EyeOff size={16} /><span>Pricing intentionally omitted for team planning.</span></div>}

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
            <span>{planningMode ? "Generated locally • Private team planning brief" : "Generated locally • Confidential estimate"}</span>
            <strong>Voxe Group</strong>
          </footer>
        </section>
      ) : (
        <>
          <section className={"metric-grid " + (planningMode ? "planning-metrics" : "pricing-metrics")}>
            {planningMode ? (
              <>
                <article className="metric-card glass-panel featured">
                  <div className="metric-icon green"><CalendarDays size={20} /></div>
                  <div><span>Delivery plan</span><strong>{calculation.totalWorkingDays} days</strong><small>{scenario.phases.length} phases • ends {friendlyDate(calculation.projectEnd)}</small></div>
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon violet"><Clock3 size={20} /></div>
                  <div><span>Calendar span</span><strong>{calculation.calendarDays} days</strong><small>{friendlyDate(calculation.projectStart)} → {friendlyDate(calculation.projectEnd)}</small></div>
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon"><Sparkles size={20} /></div>
                  <div><span>Scheduled effort</span><strong>{Math.round(calculation.totalHours)}h</strong><small>Across all delivery phases</small></div>
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon orange"><Users size={20} /></div>
                  <div><span>Assigned team</span><strong>{assignedPeopleCount}</strong><small>{workspace.people.length} people available</small></div>
                </article>
              </>
            ) : (
              <>
                <article className="metric-card glass-panel featured">
                  <div className="metric-icon"><CircleDollarSign size={20} /></div>
                  <div><span>Client quote</span><strong>{currencyFormat(scenario.currency, calculation.quote, true)}</strong><small>{currencyFormat(scenario.currency, scenario.baseHourlyPrice)} base price / hour</small></div>
                  <TrendingUp size={18} className="metric-corner" />
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon violet"><WalletCards size={20} /></div>
                  <div><span>Estimated cost</span><strong>{currencyFormat(scenario.currency, calculation.estimatedCost, true)}</strong><small>Labor and internal expenses</small></div>
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon green"><TrendingUp size={20} /></div>
                  <div><span>Gross profit</span><strong className={calculation.grossProfit < 0 ? "negative" : "positive"}>{currencyFormat(scenario.currency, calculation.grossProfit, true)}</strong><small>{calculation.grossMargin.toFixed(1)}% gross margin</small></div>
                </article>
                <article className="metric-card glass-panel">
                  <div className="metric-icon orange"><CalendarDays size={20} /></div>
                  <div><span>Delivery</span><strong>{calculation.totalWorkingDays} days</strong><small>{friendlyDate(calculation.projectEnd)} • {Math.round(calculation.totalHours)}h</small></div>
                </article>
              </>
            )}
          </section>

          {visibleWarnings.length > 0 && (
            <section className="warning-strip glass-panel">
              <AlertTriangle size={18} />
              <div><strong>{planningMode ? "Planning check" : "Pricing check"}</strong><span>{visibleWarnings.join(" ")}</span></div>
            </section>
          )}

          <section className="settings-card glass-panel">
            <div className="section-heading">
              <div className="section-title-block"><h2 className="eyebrow section-kicker">Project settings</h2></div>
            </div>
            <div className="settings-layout">
              <section className="settings-column commercial-settings" aria-labelledby="commercial-settings-title">
                <div className="settings-column-heading">
                  <span className="settings-column-icon commercial" aria-hidden="true"><CircleDollarSign size={18} /></span>
                  <div><h3 id="commercial-settings-title">Commercial</h3><small>Base pricing and project fees</small></div>
                </div>
                {planningMode ? (
                  <div className="pricing-hidden-state">
                    <EyeOff size={21} />
                    <div><strong>Pricing controls hidden</strong><span>Reveal pricing from the navigation bar when you need commercial controls.</span></div>
                  </div>
                ) : (
                  <div className="settings-panel-grid commercial-grid">
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
                    <MoneyInput label="Base price / hour" value={scenario.baseHourlyPrice} onChange={(baseHourlyPrice) => updateScenario({ baseHourlyPrice })} suffix={scenario.currency + "/h"} min={0} />
                    <MoneyInput label="Fixed starting fee" value={scenario.fixedFee} onChange={(fixedFee) => updateScenario({ fixedFee })} min={0} step={50} />
                  </div>
                )}
              </section>

              <section className="settings-column schedule-settings" aria-labelledby="schedule-settings-title">
                <div className="settings-column-heading">
                  <span className="settings-column-icon schedule" aria-hidden="true"><CalendarDays size={18} /></span>
                  <div><h3 id="schedule-settings-title">Schedule & time</h3><small>Dates, capacity and working calendar</small></div>
                </div>
                <div className="settings-panel-grid schedule-primary-grid">
                  <MoneyInput label="Default hours / day" value={scenario.defaultHours} onChange={(defaultHours) => updateScenario({ defaultHours })} suffix="hours" min={0} max={24} step={0.5} />
                  <label className="field">
                    <span>Start date</span>
                    <GlassDatePicker
                      value={scenario.startDate}
                      ariaLabel="Project start date"
                      onChange={(startDate) => updateScenario({ startDate })}
                    />
                  </label>
                </div>
                <div className="schedule-row">
                  <div>
                    <span className="mini-label" id="working-weekdays-label">Working weekdays</span>
                    <div className="day-selector" role="group" aria-labelledby="working-weekdays-label">
                      {DAY_LABELS.map((label, day) => (
                        <button
                          type="button"
                          key={label}
                          className={scenario.workingDays.includes(day) ? "active" : ""}
                          aria-pressed={scenario.workingDays.includes(day)}
                          onClick={() => toggleWorkingDay(day)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="holiday-box">
                    <span className="mini-label">Excluded holidays</span>
                    <div className="holiday-add">
                      <GlassDatePicker
                        value={holidayDraft}
                        ariaLabel="Holiday date to exclude"
                        onChange={setHolidayDraft}
                        clearable
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Add holiday"
                        disabled={!holidayDraft || scenario.holidays.includes(holidayDraft)}
                        onClick={() => {
                          if (!holidayDraft || scenario.holidays.includes(holidayDraft)) return;
                          updateScenario({ holidays: [...scenario.holidays, holidayDraft].sort() });
                          setHolidayDraft("");
                        }}
                      ><Plus size={16} /></button>
                    </div>
                    <div className="holiday-chips">
                      {scenario.holidays.map((holiday) => (
                        <button
                          type="button"
                          key={holiday}
                          aria-label={`Remove excluded holiday ${friendlyDate(holiday)}`}
                          onClick={() => updateScenario({ holidays: scenario.holidays.filter((item) => item !== holiday) })}
                        >
                          {friendlyDate(holiday)}<X size={12} />
                        </button>
                      ))}
                      {!scenario.holidays.length && <small>No excluded dates</small>}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className={"settings-extensions" + (planningMode ? " is-single" : "")}>
              <section className="settings-column settings-subpanel modifier-settings" aria-labelledby="modifiers-settings-title">
                <div className="settings-column-heading">
                  <span className="settings-column-icon schedule" aria-hidden="true"><Sparkles size={18} /></span>
                  <div>
                    <h3 id="modifiers-settings-title">{planningMode ? "Effort adjustments" : "Modifiers"}</h3>
                    <small>{planningMode ? "Adjust delivery effort without exposing price" : "Price and effort adjustments"}</small>
                  </div>
                  <button type="button" className="icon-button accent settings-panel-action" aria-label={planningMode ? "Add effort adjustment" : "Add modifier"} onClick={addModifier}><Plus size={17} /></button>
                </div>
                <div className="data-list">
                  {visibleModifiers.map((modifier) => (
                    <div className="data-row modifier-row" key={modifier.id}>
                      <input className="row-name" aria-label={modifier.name + " name"} value={modifier.name} onChange={(event) => updateModifier(modifier.id, { name: event.target.value })} />
                      {planningMode
                        ? <span className="modifier-target-chip"><Clock3 size={13} /> Effort</span>
                        : <GlassSelect ariaLabel={modifier.name + " target"} value={modifier.target} options={[{ value: "price", label: "Price" }, { value: "effort", label: "Effort" }]} onChange={(target) => updateModifier(modifier.id, { target: target as ModifierTarget })} />}
                      <GlassSelect ariaLabel={modifier.name + " type"} value={modifier.kind} options={[{ value: "percentage", label: "Percent" }, { value: "fixed", label: "Fixed " + (modifier.target === "effort" ? "hours" : scenario.currency) }]} onChange={(kind) => updateModifier(modifier.id, { kind: kind as ModifierKind })} />
                      <NumberStepper compact ariaLabel={modifier.name + " value"} value={modifier.value} step={1} suffix={modifier.kind === "percentage" ? "%" : modifier.target === "effort" ? "h" : scenario.currency} onChange={(value) => updateModifier(modifier.id, { value })} />
                      <button type="button" className="icon-button danger" aria-label={"Remove " + modifier.name} onClick={() => updateScenario({ modifiers: scenario.modifiers.filter((item) => item.id !== modifier.id) })}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {!visibleModifiers.length && <div className="empty-inline">{planningMode ? "No effort adjustments" : "No price or effort modifiers"}</div>}
                </div>
              </section>

              {!planningMode && (
                <section className="settings-column settings-subpanel expense-settings" aria-labelledby="expenses-settings-title">
                  <div className="settings-column-heading">
                    <span className="settings-column-icon commercial" aria-hidden="true"><WalletCards size={18} /></span>
                    <div><h3 id="expenses-settings-title">Expenses</h3><small>Internal, pass-through and marked-up costs</small></div>
                    <button type="button" className="icon-button accent settings-panel-action" aria-label="Add expense" onClick={addExpense}><Plus size={17} /></button>
                  </div>
                  <div className="data-list">
                    {scenario.expenses.map((expense) => {
                      const result = expenseResult(expense.id);
                      return (
                        <div className="data-row expense-row" key={expense.id}>
                          <input className="row-name" aria-label={expense.name + " name"} value={expense.name} onChange={(event) => updateExpense(expense.id, { name: event.target.value })} />
                          <NumberStepper compact ariaLabel={expense.name + " amount"} value={expense.amount} min={0} step={1} suffix={scenario.currency} onChange={(amount) => updateExpense(expense.id, { amount })} />
                          <GlassSelect ariaLabel={expense.name + " unit"} value={expense.unit} options={Object.entries(unitLabels).map(([value, label]) => ({ value, label }))} onChange={(unit) => updateExpense(expense.id, { unit: unit as ExpenseUnit })} />
                          <GlassSelect ariaLabel={expense.name + " billing"} value={expense.billing} options={Object.entries(billingLabels).map(([value, label]) => ({ value, label }))} onChange={(billing) => updateExpense(expense.id, { billing: billing as ExpenseBilling })} />
                          {expense.billing === "markup" && <NumberStepper compact ariaLabel={expense.name + " markup"} value={expense.markup} min={0} step={1} suffix="%" onChange={(markup) => updateExpense(expense.id, { markup })} />}
                          <strong>{currencyFormat(scenario.currency, result?.cost ?? 0)}</strong>
                          <button type="button" className="icon-button danger" aria-label={"Remove " + expense.name} onClick={() => updateScenario({ expenses: scenario.expenses.filter((item) => item.id !== expense.id) })}><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                    {!scenario.expenses.length && <div className="empty-inline">No additional expenses</div>}
                  </div>
                </section>
              )}
            </div>
          </section>

          <section className="phases-card glass-panel">
            <div className="section-heading">
              <div className="section-title-block"><p className="eyebrow section-kicker">Delivery plan</p><h2>Phases & staffing</h2><p>Build the team and delivery plan together in one workspace.</p></div>
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
                      onDragEnd={() => setDragOverPhase(null)}
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
                <div className={"phase-table " + (planningMode ? "planning-phase-table" : "")}>
              <div className="phase-table-head">
                <span>Phase</span><span>Schedule</span><span>Workdays</span><span>Assigned people</span><span>Hours</span>{!planningMode && <span>Cost</span>}<span />
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
                    {!planningMode && <strong>{currencyFormat(scenario.currency, result?.laborCost ?? 0)}</strong>}
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

          {!planningMode && <section className="financial-card glass-panel">
            <div className="section-heading"><div className="section-title-block"><p className="eyebrow section-kicker">Decision</p><h2>Financial pulse</h2><p>Compare the final quote with estimated delivery cost and actual gross profit.</p></div><span className={"safety-badge " + (calculation.grossProfit >= 0 ? "safe" : "unsafe")}>{calculation.grossProfit >= 0 ? <Check size={15} /> : <AlertTriangle size={15} />}{calculation.grossProfit >= 0 ? "Cost covered" : "Below cost"}</span></div>
            <div className="financial-layout">
              <div className="breakdown-list">
                <div><span>Base billable amount</span><strong>{currencyFormat(scenario.currency, calculation.baseRevenue)}</strong></div>
                <div><span>Price modifiers</span><strong>{currencyFormat(scenario.currency, calculation.modifierRevenue)}</strong></div>
                <div><span>Client-billable expenses</span><strong>{currencyFormat(scenario.currency, calculation.billableExpenses)}</strong></div>
                <div><span>Manual adjustment</span><strong>{currencyFormat(scenario.currency, scenario.manualAdjustment)}</strong></div>
                <div className="total"><span>Final quote</span><strong>{currencyFormat(scenario.currency, calculation.quote)}</strong></div>
              </div>
              <div className="margin-visual">
                <div className="margin-ring" style={{ "--margin": Math.max(0, Math.min(100, calculation.grossMargin)) + "%" } as React.CSSProperties}><div><strong>{calculation.grossMargin.toFixed(1)}%</strong><span>gross margin</span></div></div>
                <div><span>Break-even price</span><strong>{currencyFormat(scenario.currency, calculation.estimatedCost)}</strong><small>{currencyFormat(scenario.currency, calculation.grossProfit)} gross profit</small></div>
              </div>
              <div className="adjustment-panel">
                <MoneyInput label="Manual price adjustment" value={scenario.manualAdjustment} onChange={(manualAdjustment) => updateScenario({ manualAdjustment })} suffix={scenario.currency} step={50} />
                <label className="field"><span>Reason</span><input placeholder="Required for internal traceability" value={scenario.adjustmentReason} onChange={(event) => updateScenario({ adjustmentReason: event.target.value })} /></label>
                <div className="formula-note"><LockKeyhole size={15} /><span>Internal costs never appear in Client view or its printout.</span></div>
              </div>
            </div>
          </section>}
        </>
      )}

      {editingPerson && (
        <Modal title={isNewPerson ? "Add someone" : "Edit profile"} subtitle={planningMode ? "Planning details are editable; commercial fields stay hidden." : "Personal and professional details stay on this device."} onClose={() => setEditingPerson(null)} wide>
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
              {!planningMode && <MoneyInput label="Internal hourly cost" value={editingPerson.hourlyCost} onChange={(hourlyCost) => setEditingPerson({ ...editingPerson, hourlyCost })} suffix={scenario.currency + "/h"} min={0} />}
              <MoneyInput label="Default hours / day" value={editingPerson.defaultHours} onChange={(defaultHours) => setEditingPerson({ ...editingPerson, defaultHours })} suffix="hours" min={0} max={24} step={0.5} />
              <label className="field"><span>Email</span><input type="email" value={editingPerson.email} onChange={(event) => setEditingPerson({ ...editingPerson, email: event.target.value })} /></label>
              <label className="field"><span>Phone</span><input value={editingPerson.phone} onChange={(event) => setEditingPerson({ ...editingPerson, phone: event.target.value })} /></label>
              <label className="field"><span>Location</span><input value={editingPerson.location} onChange={(event) => setEditingPerson({ ...editingPerson, location: event.target.value })} /></label>
              <label className="field"><span>Skills</span><input placeholder="Comma-separated" value={editingPerson.skills} onChange={(event) => setEditingPerson({ ...editingPerson, skills: event.target.value })} /></label>
              {!planningMode && <label className="field full"><span>Internal notes</span><textarea rows={3} value={editingPerson.notes} onChange={(event) => setEditingPerson({ ...editingPerson, notes: event.target.value })} /></label>}
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

      {revealPricingOpen && (
        <Modal title="Reveal pricing?" subtitle="Use this only when the private pricing discussion is ready." onClose={() => setRevealPricingOpen(false)}>
          <div className="reveal-pricing">
            <div className="reveal-pricing-message">
              <span><Eye size={20} /></span>
              <div><strong>Commercial details will become visible everywhere.</strong><p>This includes rates, costs, expenses, margins, quotes and internal financial notes.</p></div>
            </div>
            <div className="modal-actions">
              <span />
              <button type="button" className="button secondary" onClick={() => setRevealPricingOpen(false)}>Keep hidden</button>
              <button type="button" className="button primary" onClick={revealPricing}><Eye size={16} /> Reveal pricing</button>
            </div>
          </div>
        </Modal>
      )}

      {exportOpen && (
        <Modal title="Export project" subtitle="Choose how you want to share or save this project." onClose={() => setExportOpen(false)}>
          <div className="export-options">
            <button className="export-choice" onClick={printClientEstimate}>
              <span className="export-choice-icon"><Printer size={21} /></span>
              <span><strong>{planningMode ? "Print planning brief" : "Print client estimate"}</strong><small>{planningMode ? "Prints the schedule, phases, effort and team with pricing omitted." : "Opens the clean client view and print dialog."}</small></span>
            </button>
            {!planningMode && <button className="export-choice" onClick={downloadProject}>
              <span className="export-choice-icon"><FileDown size={21} /></span>
              <span><strong>Download project JSON</strong><small>Saves an editable backup you can import later.</small></span>
            </button>}
            <p className="export-note">{planningMode ? <EyeOff size={15} /> : <Info size={15} />} {planningMode ? "Pricing stays excluded from this printout. Turn off Planning mode for the complete project backup." : "The JSON file includes internal pricing and people data."}</p>
          </div>
        </Modal>
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><Check size={16} />{toast}</div>}
    </main>
  );
}
