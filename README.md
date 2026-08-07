<div align="center">
  <img src="./public/favicon.svg" width="76" height="76" alt="Project Planner logo">

  <h1>Project Planner</h1>

  <p><strong>Plan the delivery. Model the economics. Present a confident quote.</strong></p>
  <p>
    A privacy-first project pricing and delivery-planning workspace built for Voxe Group.
  </p>

  <p>
    <code>React 19</code>
    <code>TypeScript 5</code>
    <code>Next.js 16</code>
    <code>Vinext</code>
    <code>Vite 8</code>
    <code>Cloudflare Workers</code>
  </p>
  <p><code>voxegroup-project-planner</code></p>
</div>

---

## Overview

Project Planner brings delivery planning and commercial modeling into one focused workspace. It connects project phases, team assignments, working calendars, expenses, pricing modifiers, and margin analytics so a quote remains traceable from the plan behind it.

The app opens with a realistic built-in preset and **Pricing** selected by default. It is intentionally session-only: edits remain in memory for the current page session and a refresh restores the original preset.

## What it can do

| Area | Capability |
| --- | --- |
| Project setup | Configure currency, start date, hours per day, client hourly price, fixed fees, and manual adjustments. |
| Schedule | Select working weekdays, add holidays, and calculate phase dates and the full calendar span. |
| Team | Maintain people, roles, departments, skills, employment type, and internal hourly costs. |
| Staffing | Assign people to phases with drag-and-drop or assignment controls. |
| Expenses | Model fixed, person-hour, workday, calendar-day, and monthly costs as internal, pass-through, or marked-up expenses. |
| Modifiers | Apply fixed or percentage changes to effort or price. |
| Analytics | Review gross margin, cost coverage, revenue per hour, effort impact, quote reconciliation, cost mix, and target-margin quotes. |
| Client output | Switch to a client-facing estimate that omits internal cost and margin details and is suitable for printing. |
| Project files | Export the current workspace as editable JSON and import it again during a later session. |

## Workspace modes

Two independent controls keep planning, pricing, and presentation concerns separate:

| Control | Options | Purpose |
| --- | --- | --- |
| Commercial visibility | **Pricing** / Planning | Pricing shows commercial inputs and analytics. Planning hides sensitive pricing information while keeping delivery work accessible. |
| Audience | **Internal** / Client | Internal exposes the full working interface. Client presents a simplified estimate without internal rates, cost, profit, or margin data. |

New sessions start in **Pricing + Internal** mode.

## Calculation model

The quote is derived from the delivery plan rather than entered as an isolated number:

```text
phase effort     = workdays x hours per day x assigned people
adjusted effort  = phase effort + fixed and percentage effort modifiers
labor cost       = adjusted assigned hours x each person's internal hourly cost
base revenue     = fixed fee + adjusted effort x client hourly price
final quote      = base revenue
                 + price modifiers
                 + billable expenses
                 + manual adjustment
```

The engine also:

- Skips disabled weekdays and configured holidays when scheduling phases.
- Recalculates calendar-based expenses when the delivery span changes.
- Supports fixed, person-hour, workday, calendar-day, and monthly expense units.
- Separates internal expenses from pass-through and marked-up billable expenses.
- Produces project dates, labor cost, estimated cost, gross profit, gross margin, and warnings from the same normalized model.
- Clamps negative effort, cost, and final quote outcomes to safe lower bounds.

## Privacy and data lifecycle

> [!IMPORTANT]
> Refreshing or reopening the app discards current edits and restores the built-in preset. Export a JSON file before refreshing if the work needs to be retained.

- Workspace state lives only in React memory for the current page session.
- The app does not read or write project data to local storage.
- Legacy storage entries and retired application caches from older releases are removed automatically.
- The pricing runtime does not require a database, project API, analytics service, or telemetry provider.
- Importing a file changes only the current in-memory session.
- Reset explicitly discards current work and restores the preset.
- Exported JSON can contain names, internal rates, costs, and commercial assumptions; treat it as confidential business data.

## Technology

| Layer | Implementation |
| --- | --- |
| Interface | React 19, Next.js App Router APIs, Geist, and Lucide React |
| Language | TypeScript 5.9 |
| Application build | Vinext on Vite 8 |
| Styling | Tailwind CSS 4 pipeline with a custom responsive glass design system |
| Runtime | Cloudflare Worker-compatible server output |
| State | React reducer and component state; no persisted workspace store |
| Pricing domain | Framework-independent TypeScript calculations, calendar helpers, normalization, selectors, and immutable actions |
| Quality | ESLint, TypeScript, Node's test runner, SSR rendering checks, and artifact validation |

Drizzle scaffolding is present for platform examples, but the pricing application itself does not require or connect to a database.

## Repository structure

```text
app/
  layout.tsx                 Application metadata and global styles
  page.tsx                   Route entry point
components/
  app/                       Shared application-level visuals
  ui/                        Reusable controls and design-system primitives
features/
  project-planner/           Project workspace, hooks, and feature panels
lib/
  files/                     JSON export helpers
  pricing/                   Domain model, calculations, calendar, and actions
public/                      Manifest, icon, and legacy cache-retirement worker
tests/                       Domain, state-action, and rendered-UI regression tests
worker/                      Cloudflare-compatible request entry point
```

The pricing engine is kept outside React so calculations can be tested deterministically and reused independently of the interface.

## Getting started

### Requirements

- Node.js 22.13 or newer
- npm
- A Bash-compatible environment for the checked-in build and lint wrappers

On Windows, use WSL or configure Git Bash as the npm script shell for commands that invoke Bash.

### Install and develop

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

### Production build

```bash
npm run build
npm start
```

The verified build creates a Cloudflare Worker-compatible artifact in `dist` and confirms that the packaged server exposes a valid `fetch` handler.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
```

| Command | Purpose |
| --- | --- |
| `npm test` | Builds the app and runs domain, workspace-action, and rendered-page regression tests. |
| `npm run typecheck` | Checks the TypeScript project without emitting files. |
| `npm run lint` | Runs ESLint across the source tree. |
| `npm run build` | Runs a bounded production build and validates the generated artifact. |
| `npm run validate:artifact` | Validates an existing `dist` server and hosting manifest. |

## Typical workflow

1. Set the project currency, start date, working week, and holidays.
2. Add or edit team members and their internal hourly costs.
3. Build the phase plan and assign the delivery team.
4. Add expenses and effort or price modifiers.
5. Review the quote, estimated cost, profit, and Decision Analytics.
6. Switch to Client view to review or print the customer-facing estimate.
7. Export the project JSON before refreshing if the work should be kept.

## Deployment

The application targets a Cloudflare-compatible server runtime through Vinext and the Cloudflare Vite plugin.

- No application environment variables are required for the calculator.
- No D1 database, R2 bucket, authentication provider, or third-party pricing service is required.
- The production artifact is generated under `dist`.
- The old offline service worker is intentionally retired so refreshes always request the current application.

## License

This project is proprietary software owned by Voxe Group. No public license to use, copy, modify, or distribute the source code is granted.

See [LICENSE](./LICENSE) for the complete notice.
