import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function renderPage() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders development preview metadata", async () => {
  const response = await renderPage();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("starts with pricing omitted from the fail-closed planning render", async () => {
  const response = await renderPage();
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /VOXE/i);
  assert.match(html, /Planning mode/i);
  assert.match(html, /role="switch"[^>]*aria-checked="true"/i);
  assert.match(html, /aria-label="Import project"/i);
  assert.match(html, /aria-label="Export project"/i);
  assert.match(html, /\bImport\b/i);
  assert.match(html, /Pricing controls hidden/i);
  assert.match(html, /Project settings/i);
  assert.match(html, /Phases &amp; staffing/i);
  assert.doesNotMatch(html, /section-kicker[^>]*>\s*Delivery plan/i);
  assert.match(html, /phase-workspace-heading[\s\S]{0,2000}aria-label="Add phase"/i);
  assert.match(html, /people-workspace-heading[\s\S]{0,1200}<h3>People<\/h3>/i);
  assert.doesNotMatch(html, /Talent pool/i);
  assert.doesNotMatch(html, /Available for phase assignments|add-person-card/i);
  assert.match(html, /Effort adjustments/i);
  assert.match(html, /aria-label="Add AI notes for Delivery contingency"/i);
  for (const panel of ["Commercial", "Schedule and time", "Effort adjustments", "People", "Phases"]) {
    assert.match(html, new RegExp(`aria-label="Maximize ${panel}"`, "i"));
  }
  assert.match(html, /aria-label="Project start date"[^>]*aria-haspopup="dialog"/i);
  assert.match(html, /Default hours \/ day/i);
  assert.match(html, /Scheduled effort[\s\S]{0,800}<strong>518(?:<!-- -->)?h<\/strong>/i);
  assert.match(html, /Drag people here/i);
  assert.match(html, /class="phase-number-heading">Hours<\/span>/i);
  assert.equal((html.match(/class="phase-number phase-hours-value"/g) ?? []).length, 4);
  assert.equal((html.match(/class="phase-date"/g) ?? []).length, 4);
  assert.match(html, /class="phase-date"[\s\S]{0,1400}<time[^>]*dateTime="2026-08-09"[^>]*>August 9, 2026<\/time>[\s\S]{0,500}<time[^>]*dateTime="2026-08-13"[^>]*>August 13, 2026<\/time>/i);
  assert.doesNotMatch(html, /class="phase-name-cell"[^>]*>\s*<svg/i);
  assert.doesNotMatch(html, /class="number-stepper compact-stepper"(?=[\s\S]{0,800}aria-label="Decrease [^"]+ workdays")/i);
  assert.equal((html.match(/class="number-stepper "(?=[\s\S]{0,800}aria-label="Decrease [^"]+ workdays")/gi) ?? []).length, 4);
  assert.equal((html.match(/phase-action-button/g) ?? []).length, 4);
  assert.match(html, /aria-label="Phase totals"/i);
  assert.match(html, /phase-total-duration[\s\S]{0,500}>40(?:<!-- -->)? workdays<[\s\S]{0,300}>54(?:<!-- -->)? calendar days</i);
  assert.match(html, /phase-total-hours[\s\S]{0,500}>518(?:<!-- -->)?h</i);
  assert.match(html, /phase-total-phases[\s\S]{0,500}>4<[\s\S]{0,300}>Delivery phases</i);
  assert.match(html, /phase-total-people[\s\S]{0,500}>4<[\s\S]{0,300}>Unique team members</i);
  assert.doesNotMatch(html, /phase-total-(?:labor|price)/i);
  assert.equal((html.match(/<button(?=[^>]*class="[^"]*\bperson-card\b)(?=[^>]*draggable="true")[^>]*>/gi) ?? []).length, 4);
  assert.doesNotMatch(html, /type="date"/i);
  assert.doesNotMatch(html, /aria-label="[^"]+ schedule"|After previous|Alongside previous/i);
  assert.doesNotMatch(html, /add-person-button|Assign someone|person-picker/i);
  assert.doesNotMatch(html, /aria-label="[^"]+ hours per day"|h\/d/i);
  assert.doesNotMatch(html, /elastic-(?:pair|panel)|dragging-person/i);
  assert.doesNotMatch(html, /\b0[1-5]\s*•/);
  assert.doesNotMatch(html, /Local only|Saved on this device|>\s*(?:Pricing|Planning) Studio\s*</i);
  assert.doesNotMatch(html, /id="expenses-settings-title"/i);
  assert.doesNotMatch(html, /aria-label="Maximize Expenses"/i);
  assert.doesNotMatch(html, /topbar glass-panel is-compact|metric-grid [^"]*is-compact/i);
  assert.doesNotMatch(
    html,
    /Client quote|Estimated cost|Gross profit|Gross margin|Financial pulse|Decision analytics|Quote reconciliation|Cost &amp; pricing guide|Cost coverage|Service revenue \/ hour|Target-margin quote|Commercial adjustment|Manual price adjustment|AI notes for (?:commercial adjustment|base price per hour|fixed starting fee)|Base billable amount|Total project price|Estimated investment|Internal hourly cost|Cloud development environment|AI sandbox usage|AI integration complexity/i,
  );
});

test("keeps pricing fail-closed without scroll-driven compact chrome", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /savedPlanningMode === null \? true : savedPlanningMode === "true"/);
  assert.doesNotMatch(source, /compactChrome|setCompactChrome|handleViewportChange|syncTopbarHeight/);
  assert.doesNotMatch(source, /chrome-compact|topbar glass-panel\$\{[^}]*is-compact|metric-grid [^`]*is-compact/);
  assert.doesNotMatch(source, /new ResizeObserver\(/);
  assert.doesNotMatch(styles, /--sticky-nav|\.chrome-compact|\.topbar\.is-compact|\.metric-grid\.is-compact/);
  assert.match(source, /schemaVersion: 6/);
  assert.match(source, /project\.baseHourlyPriceNotes = typeof project\.baseHourlyPriceNotes === "string"/);
  assert.match(source, /project\.fixedFeeNotes = typeof project\.fixedFeeNotes === "string"/);
  assert.match(source, /project\.adjustmentReason = typeof project\.adjustmentReason === "string"/);
  assert.match(source, /AI notes for base price per hour/);
  assert.match(source, /AI notes for fixed starting fee/);
  assert.match(source, /updateScenario\(\{ baseHourlyPriceNotes: event\.target\.value \}\)/);
  assert.match(source, /updateScenario\(\{ fixedFeeNotes: event\.target\.value \}\)/);
  assert.match(source, /phase-total-duration[\s\S]{0,300}\{calculation\.totalWorkingDays\} workdays/);
  assert.match(source, /phase-total-hours[\s\S]{0,300}Math\.round\(calculation\.totalHours\)/);
  assert.match(source, /phase-total-people[\s\S]{0,300}\{assignedPeopleCount\}/);
  assert.match(source, /\{!planningMode && \([\s\S]{0,500}phase-total-item phase-total-labor[\s\S]{0,700}phase-total-item phase-total-price/);
  assert.match(source, /phase-total-price[\s\S]{0,300}currencyFormat\(scenario\.currency, calculation\.quote\)/);
  assert.doesNotMatch(source, /decision-adjustment-panel|decision-privacy-note/);
});
