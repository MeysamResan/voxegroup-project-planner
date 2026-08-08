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

export const nextPersonColor = (
  people: ReadonlyArray<Pick<Person, "color">>,
): string => {
  const usage = new Map(COLORS.map((color) => [color.toLowerCase(), 0]));

  for (const person of people) {
    const key = person.color.toLowerCase();
    const count = usage.get(key);
    if (count !== undefined) usage.set(key, count + 1);
  }

  return COLORS.reduce((leastUsed, color) => {
    const leastUsedCount = usage.get(leastUsed.toLowerCase()) ?? 0;
    const colorCount = usage.get(color.toLowerCase()) ?? 0;
    return colorCount < leastUsedCount ? color : leastUsed;
  }, COLORS[0]);
};

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
      assistantNotesMarkdown: [
        "# Project brief",
        "",
        "## Priorities",
        "- Keep operational workflows simple.",
        "- Validate Arabic voice quality before launch.",
        "",
        "## Open questions",
        "- [ ] Confirm the migration owner",
        "- [ ] Agree the UAT sign-off date",
      ].join("\n"),
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
          notes: "Align stakeholders on the operating model, technical constraints, risks, and a delivery-ready scope.",
          days: 5,
          assignments: [
            { personId: designer.id },
            { personId: developer.id },
            { personId: deliveryLead.id },
          ],
          tasks: [
            {
              id: "task-stakeholder-research",
              name: "Stakeholder interviews & journey audit",
              notes: "Capture current workflows, pain points, decision owners, and measurable success criteria.",
              days: 2,
              assignments: [
                { personId: designer.id },
                { personId: deliveryLead.id },
              ],
            },
            {
              id: "task-technical-architecture",
              name: "Technical architecture & risk mapping",
              notes: "Document system boundaries, integration risks, security needs, and architectural decisions.",
              days: 2,
              assignments: [
                { personId: developer.id },
                { personId: deliveryLead.id },
              ],
            },
            {
              id: "task-scope-delivery-blueprint",
              name: "Scope alignment & delivery blueprint",
              notes: "",
              days: 1,
              assignments: [
                { personId: designer.id },
                { personId: developer.id },
                { personId: deliveryLead.id },
              ],
            },
          ],
        },
        {
          id: "phase-service-blueprint-design",
          name: "Service blueprint & product design",
          notes: "",
          days: 8,
          assignments: [{ personId: designer.id }, { personId: developer.id }],
          tasks: [
            {
              id: "task-service-blueprint",
              name: "Service blueprint & user flows",
              notes: "Map frontstage and backstage steps, ownership, handoffs, and exception paths.",
              days: 3,
              assignments: [{ personId: designer.id }],
            },
            {
              id: "task-interaction-prototype",
              name: "Interaction design & prototype",
              notes: "",
              days: 3,
              assignments: [
                { personId: designer.id },
                { personId: developer.id },
              ],
            },
            {
              id: "task-design-validation-handoff",
              name: "Design validation & engineering handoff",
              notes: "Resolve validation findings and package states, rules, and assets for implementation.",
              days: 2,
              assignments: [
                { personId: designer.id },
                { personId: developer.id },
              ],
            },
          ],
        },
        {
          id: "phase-core-platform-build",
          name: "Core platform build",
          notes: "Implement the production foundation and the priority operations workflows defined during design.",
          days: 18,
          assignments: [{ personId: developer.id }, { personId: devops.id }],
          tasks: [
            {
              id: "task-platform-foundation",
              name: "Platform foundation & data model",
              notes: "Establish environments, application structure, access controls, and the initial data model.",
              days: 4,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
            {
              id: "task-core-operations-workflows",
              name: "Core operations workflows",
              notes: "",
              days: 7,
              assignments: [{ personId: developer.id }],
            },
            {
              id: "task-admin-reporting",
              name: "Admin, permissions & reporting",
              notes: "Add administrative controls, role-based permissions, and agreed operational reporting.",
              days: 5,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
            {
              id: "task-build-stabilization",
              name: "Stabilization & code review",
              notes: "",
              days: 2,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
          ],
        },
        {
          id: "phase-ai-voice-automation",
          name: "AI voice & automation",
          notes: "Deliver the Arabic voice experience with measurable quality, safe fallbacks, and operational controls.",
          days: 10,
          assignments: [
            { personId: aiContractor.id },
            { personId: developer.id },
            { personId: devops.id },
          ],
          tasks: [
            {
              id: "task-voice-experience",
              name: "Voice experience & conversation flows",
              notes: "Define intents, prompts, recovery behavior, escalation paths, and conversation tone.",
              days: 3,
              assignments: [
                { personId: aiContractor.id },
                { personId: developer.id },
              ],
            },
            {
              id: "task-arabic-voice-integration",
              name: "Arabic voice model integration",
              notes: "Integrate the selected speech services and tune Arabic handling against representative calls.",
              days: 4,
              assignments: [
                { personId: aiContractor.id },
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
            {
              id: "task-ai-evaluation-safety",
              name: "Evaluation, safety & fallback tuning",
              notes: "",
              days: 3,
              assignments: [
                { personId: aiContractor.id },
                { personId: developer.id },
              ],
            },
          ],
        },
        {
          id: "phase-integrations-data",
          name: "Integrations & data migration",
          notes: "",
          days: 8,
          assignments: [{ personId: developer.id }, { personId: devops.id }],
          tasks: [
            {
              id: "task-integration-contracts",
              name: "Integration contracts & data mapping",
              notes: "Confirm API contracts, ownership, field mappings, data quality rules, and error handling.",
              days: 2,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
            {
              id: "task-connector-implementation",
              name: "Connector implementation",
              notes: "",
              days: 3,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
            {
              id: "task-migration-rehearsal",
              name: "Data migration rehearsal",
              notes: "Execute a full dry run, reconcile results, measure timing, and verify rollback steps.",
              days: 3,
              assignments: [
                { personId: developer.id },
                { personId: devops.id },
              ],
            },
          ],
        },
        {
          id: "phase-qa-uat-launch",
          name: "QA, UAT & launch",
          notes: "Validate the complete service, secure client acceptance, and release with monitored hypercare.",
          days: 7,
          assignments: [
            { personId: qa.id },
            { personId: developer.id },
            { personId: deliveryLead.id },
            { personId: devops.id },
          ],
          tasks: [
            {
              id: "task-regression-testing",
              name: "Test strategy & regression pass",
              notes: "Run risk-based functional, integration, accessibility, and regression coverage.",
              days: 3,
              assignments: [
                { personId: qa.id },
                { personId: developer.id },
              ],
            },
            {
              id: "task-client-uat",
              name: "Client UAT & release readiness",
              notes: "",
              days: 2,
              assignments: [
                { personId: qa.id },
                { personId: deliveryLead.id },
              ],
            },
            {
              id: "task-production-launch",
              name: "Production launch & hypercare",
              notes: "Deploy with monitoring, validate critical journeys, and provide focused post-launch support.",
              days: 2,
              assignments: [
                { personId: developer.id },
                { personId: deliveryLead.id },
                { personId: devops.id },
              ],
            },
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
