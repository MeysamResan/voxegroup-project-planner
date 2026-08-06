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

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    people: [designer, developer, qa, aiContractor],
    project: {
      projectName: "Customer Operations Platform",
      currency: "USD",
      startDate: DEFAULT_START_DATE,
      baseHourlyPrice: 55,
      baseHourlyPriceNotes: "",
      fixedFee: 1500,
      fixedFeeNotes: "",
      defaultHours: DEFAULT_HOURS_PER_DAY,
      workingDays: [0, 1, 2, 3, 4],
      holidays: [],
      phases: [
        {
          id: "phase-discovery-architecture",
          name: "Discovery & architecture",
          days: 5,
          assignments: [{ personId: designer.id }, { personId: developer.id }],
        },
        {
          id: "phase-product-design",
          name: "Product design",
          days: 8,
          assignments: [{ personId: designer.id }, { personId: developer.id }],
        },
        {
          id: "phase-build-integrations",
          name: "Build & integrations",
          days: 20,
          assignments: [{ personId: developer.id }, { personId: aiContractor.id }],
        },
        {
          id: "phase-qa-uat-launch",
          name: "QA, UAT & launch",
          days: 7,
          assignments: [{ personId: qa.id }, { personId: developer.id }],
        },
      ],
      expenses: [
        {
          id: "expense-cloud-development",
          name: "Cloud development environment",
          notes: "",
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
      ],
      modifiers: [
        {
          id: "modifier-ai-complexity",
          name: "AI integration complexity",
          notes: "",
          kind: "percentage",
          target: "price",
          value: 12,
        },
        {
          id: "modifier-delivery-contingency",
          name: "Delivery contingency",
          notes: "",
          kind: "percentage",
          target: "effort",
          value: 8,
        },
      ],
      manualAdjustment: 0,
      adjustmentReason: "",
    },
  };
};

export const createInitialWorkspace = initialWorkspace;
