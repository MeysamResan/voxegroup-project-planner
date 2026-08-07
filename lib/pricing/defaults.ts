import { APP_ID, COLORS, DEFAULT_HOURS_PER_DAY, DEFAULT_START_DATE, SCHEMA_VERSION } from "./constants.ts";
import type { Person, Workspace } from "./types.ts";

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const makePerson = (
  person: Partial<Person> & Pick<Person, "name" | "role">,
): Person => ({
  id: person.id ?? uid(),
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
  color: person.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
});

export const initialWorkspace = (): Workspace => {
  const designer = makePerson({
    id: "person-maya-al-safi",
    name: "Maya Al-Safi",
    role: "Product Designer",
    department: "Design",
    hourlyCost: 12,
    skills: "Product design, research, prototyping",
    color: COLORS[1],
  });
  const developer = makePerson({
    id: "person-omar-nouri",
    name: "Omar Nouri",
    role: "Full-stack Engineer",
    department: "Engineering",
    hourlyCost: 16,
    skills: "TypeScript, React, APIs",
    color: COLORS[0],
  });
  const qa = makePerson({
    id: "person-rana-aziz",
    name: "Rana Aziz",
    role: "QA Specialist",
    department: "Quality",
    hourlyCost: 9,
    skills: "Manual QA, test planning, UAT",
    color: COLORS[2],
  });
  const aiContractor = makePerson({
    id: "person-noor-haddad",
    name: "Noor Haddad",
    role: "AI Voice Specialist",
    type: "Contractor",
    department: "AI Lab",
    hourlyCost: 24,
    skills: "Voice AI, model evaluation, Arabic TTS",
    color: COLORS[3],
  });
  const deliveryLead = makePerson({
    id: "person-layla-karim",
    name: "Layla Karim",
    type: "Employee",
    role: "Delivery Lead",
    department: "Delivery",
    hourlyCost: 18,
    skills: "Project delivery, stakeholder alignment, risk management",
    notes: "Coordinates client decisions and cross-functional delivery.",
    color: COLORS[4],
  });
  const devops = makePerson({
    id: "person-youssef-saleh",
    name: "Youssef Saleh",
    type: "Freelancer",
    role: "Backend & DevOps Engineer",
    department: "Engineering",
    hourlyCost: 17,
    skills: "Node.js, PostgreSQL, cloud infrastructure",
    notes: "",
    color: COLORS[5],
  });

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    people: [designer, developer, qa, aiContractor, deliveryLead, devops],
    project: {
      projectName: "Customer Operations Platform",
      currency: "USD",
      startDate: DEFAULT_START_DATE,
      baseHourlyPrice: 55,
      baseHourlyPriceNotes: "Blended client rate for the delivery team.",
      fixedFee: 1500,
      fixedFeeNotes: "",
      defaultHours: DEFAULT_HOURS_PER_DAY,
      workingDays: [0, 1, 2, 3, 4],
      holidays: ["2026-08-27", "2026-09-06"],
      phases: [
        {
          id: "phase-discovery-architecture",
          name: "Discovery & architecture",
          days: 5,
          assignments: [
            { personId: designer.id },
            { personId: developer.id },
            { personId: deliveryLead.id },
          ],
        },
        {
          id: "phase-service-blueprint-design",
          name: "Service blueprint & product design",
          days: 8,
          assignments: [{ personId: designer.id }, { personId: developer.id }],
        },
        {
          id: "phase-core-platform-build",
          name: "Core platform build",
          days: 18,
          assignments: [{ personId: developer.id }, { personId: devops.id }],
        },
        {
          id: "phase-ai-voice-automation",
          name: "AI voice & automation",
          days: 10,
          assignments: [
            { personId: aiContractor.id },
            { personId: developer.id },
            { personId: devops.id },
          ],
        },
        {
          id: "phase-integrations-data",
          name: "Integrations & data migration",
          days: 8,
          assignments: [{ personId: developer.id }, { personId: devops.id }],
        },
        {
          id: "phase-qa-uat-launch",
          name: "QA, UAT & launch",
          days: 7,
          assignments: [
            { personId: qa.id },
            { personId: developer.id },
            { personId: deliveryLead.id },
            { personId: devops.id },
          ],
        },
      ],
      expenses: [
        {
          id: "expense-cloud-development",
          name: "Cloud development environment",
          notes: "Shared staging infrastructure and observability.",
          amount: 240,
          unit: "fixed",
          billing: "internal",
          markup: 0,
        },
        {
          id: "expense-ai-sandbox",
          name: "AI sandbox usage",
          notes: "",
          amount: 1.25,
          unit: "person_hour",
          billing: "markup",
          markup: 15,
        },
        {
          id: "expense-messaging-integrations",
          name: "Messaging & integration services",
          notes: "",
          amount: 18,
          unit: "workday",
          billing: "pass_through",
          markup: 0,
        },
        {
          id: "expense-uat-environment",
          name: "UAT environment & support",
          notes: "Client-accessible testing environment for the scheduled project span.",
          amount: 12,
          unit: "calendar_day",
          billing: "markup",
          markup: 10,
        },
      ],
      modifiers: [
        {
          id: "modifier-delivery-contingency",
          name: "Delivery contingency",
          notes: "Buffer for review cycles and delivery risk.",
          kind: "percentage",
          target: "effort",
          value: 8,
        },
        {
          id: "modifier-accessibility-localization",
          name: "Accessibility & localization buffer",
          notes: "",
          kind: "fixed",
          target: "effort",
          value: 24,
        },
        {
          id: "modifier-ai-complexity",
          name: "AI integration complexity",
          notes: "Commercial premium for AI orchestration and evaluation.",
          kind: "percentage",
          target: "price",
          value: 12,
        },
        {
          id: "modifier-launch-support",
          name: "Launch support package",
          notes: "",
          kind: "fixed",
          target: "price",
          value: 1200,
        },
      ],
      manualAdjustment: -500,
      adjustmentReason: "Returning-client credit",
    },
  };
};

export const createInitialWorkspace = initialWorkspace;
