import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const visibleText = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

const assertVisible = (text, labels) => {
  for (const label of labels) {
    assert.match(text, new RegExp(escapeRegExp(label), "i"), `Expected visible text: ${label}`);
  }
};

const assertNotVisible = (text, labels) => {
  for (const label of labels) {
    assert.doesNotMatch(
      text,
      new RegExp(escapeRegExp(label), "i"),
      `Sensitive text must not be visible in Planning mode: ${label}`,
    );
  }
};

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

test("renders the application shell and development preview metadata", async () => {
  const response = await renderPage();
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /<html[^>]*\blang="en"/i);
  assert.match(html, /<main[^>]*\bdata-hydrated="false"/i);
});

test("fresh SSR defaults to pricing and exposes the complete preset", async () => {
  const response = await renderPage();
  const html = await response.text();
  const text = visibleText(html);

  assert.equal(response.status, 200);
  assertVisible(text, [
    "VOXE",
    "GROUP",
    "Planning",
    "Pricing",
    "Reset",
    "Import",
    "Export",
    "Client quote",
    "Estimated cost",
    "Gross profit",
    "Delivery",
    "Project settings",
    "Commercial",
    "Base price / hour",
    "Fixed starting fee",
    "Manual price adjustment",
    "Schedule & time",
    "Calculated timeline",
    "Calendar span",
    "Planned effort",
    "Modifiers",
    "Expenses",
    "Phases & staffing",
    "People",
    "Phases",
    "Project duration",
    "Labor cost",
    "Total project price",
    "Unique team members",
    "Decision analytics",
    "Quote reconciliation",
    "Cost & pricing guide",
    "Final quote",
  ]);

  assertNotVisible(text, [
    "Pricing controls hidden",
    "Team planning brief",
  ]);
  assert.doesNotMatch(
    html,
    />\s*Effort adjustments\s*</i,
    "The Planning-only Effort adjustments heading should not render by default",
  );
  assert.match(text, /\$\s*\d/, "Pricing amounts should be visible in the default mode");

  for (const presetValue of [
    "Delivery contingency",
    "AI integration complexity",
    "Launch support package",
    "Cloud development environment",
    "AI sandbox usage",
  ]) {
    assert.match(html, new RegExp(`\\bvalue="${escapeRegExp(presetValue)}"`, "i"));
  }
  assert.match(html, /\bvalue="Accessibility &amp; localization buffer"/i);
  assert.match(html, /\bvalue="Messaging &amp; integration services"/i);
  assert.match(html, /\bvalue="UAT environment &amp; support"/i);

  assert.match(
    html,
    /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Pricing visibility")[^>]*>/i,
  );
  assert.match(
    html,
    /<button(?=[^>]*\baria-pressed="false")(?=[^>]*\baria-label="Planning mode")[^>]*>\s*Planning\s*<\/button>/i,
  );
  assert.match(
    html,
    /<button(?=[^>]*\baria-pressed="true")(?=[^>]*\baria-label="Pricing mode")[^>]*>\s*Pricing\s*<\/button>/i,
  );
  assert.match(
    html,
    /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Interface view")[^>]*>/i,
  );
  assert.match(html, /<button(?=[^>]*\baria-pressed="true")[^>]*>\s*Internal\s*<\/button>/i);
  assert.match(
    html,
    /<input(?=[^>]*\baria-label="Project name")(?=[^>]*\bvalue="Customer Operations Platform")[^>]*>/i,
  );
  assert.match(html, /aria-label="Import project"/i);
  assert.match(html, /aria-label="Export project"/i);
  assert.match(html, /aria-label="Reset all data"/i);
  assert.match(html, /aria-label="Project start date"[^>]*aria-haspopup="dialog"/i);
  assert.match(html, /aria-label="Calculated schedule"[^>]*aria-live="polite"/i);
  assert.match(html, /aria-label="Add modifier"/i);
  assert.match(html, /aria-label="Add expense"/i);
  assert.match(html, /aria-label="Edit AI notes for Delivery contingency"/i);
  assert.match(html, /aria-label="Add person"/i);
  assert.match(html, /aria-label="Add phase"/i);
  assert.match(html, /aria-label="Phase totals"/i);
  assert.match(html, /aria-labelledby="phases-staffing-title"/i);
  for (const panel of ["Commercial", "Modifiers", "Expenses", "People", "Phases"]) {
    assert.match(html, new RegExp(`aria-label="Maximize ${escapeRegExp(panel)}"`, "i"));
  }
  assert.match(html, /aria-label="Maximize Schedule and time"/i);
});

test("workspace and app-shell state stay session-only and reset restores the preset", async () => {
  const [route, planner, workspaceHook, resetDialog, retirementWorker, serverWorker] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/project-planner/ProjectPlanner.tsx", import.meta.url), "utf8"),
      readFile(new URL("../features/project-planner/hooks/useProjectWorkspace.ts", import.meta.url), "utf8"),
      readFile(new URL("../features/project-planner/components/ResetWorkspaceDialog.tsx", import.meta.url), "utf8"),
      readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
      readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    ]);

  assert.match(
    route,
    /import\s*{\s*ProjectPlanner\s*}\s*from\s*["']@\/features\/project-planner\/ProjectPlanner["']/,
  );
  assert.match(route, /return\s*<ProjectPlanner\s*\/>/);
  assert.match(planner, /export\s+function\s+ProjectPlanner\s*\(/);
  assert.match(planner, /useProjectWorkspace\s*\(\s*\)/);

  assert.match(workspaceHook, /useReducer\(workspaceReducer, undefined, initialWorkspace\)/);
  assert.match(
    workspaceHook,
    /const \[planningMode, setPlanningMode\] = useState\(false\)/,
  );
  assert.doesNotMatch(workspaceHook, /localStorage\.(?:getItem|setItem)\s*\(/);
  assert.match(workspaceHook, /\.\.\.LEGACY_STORAGE_KEYS/);
  assert.match(workspaceHook, /localStorage\.removeItem\(storageKey\)/);
  assert.doesNotMatch(workspaceHook, /JSON\.(?:parse|stringify)/);
  assert.doesNotMatch(workspaceHook, /navigator\.serviceWorker\.register\s*\(/);
  assert.match(workspaceHook, /navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(workspaceHook, /registration\.unregister\(\)/);
  assert.match(workspaceHook, /window\.caches\.keys\(\)/);
  assert.match(workspaceHook, /RETIRED_CACHE_PREFIXES\.some/);

  assert.match(
    planner,
    /dispatch\(workspaceActions\.replaceWorkspace\(initialWorkspace\(\)\)\)/,
  );
  assert.match(planner, /useLegacyBrowserCleanup\(\)/);
  assert.match(planner, /setPlanningMode\(false\)/);
  assert.match(planner, /setView\("internal"\)/);
  assert.match(planner, /importRequestRef\.current \+= 1/);
  assert.match(resetDialog, /title="Restore the preset\?"/);
  assert.match(resetDialog, /All current edits and imported data will be discarded\./);
  assert.match(resetDialog, /variant="danger"/);

  assert.match(retirementWorker, /self\.skipWaiting\(\)/);
  assert.match(retirementWorker, /RETIRED_CACHE_PREFIXES\.some/);
  assert.match(retirementWorker, /self\.clients\.claim\(\)/);
  assert.match(retirementWorker, /self\.registration\.unregister\(\)/);
  assert.match(retirementWorker, /client\.navigate\(client\.url\)/);
  assert.doesNotMatch(retirementWorker, /addEventListener\("fetch"/);
  assert.doesNotMatch(retirementWorker, /cache\.put|cache\.addAll/);
  assert.match(serverWorker, /url\.pathname !== "\/sw\.js"/);
  assert.match(
    serverWorker,
    /headers\.set\("Cache-Control", "no-store, max-age=0, must-revalidate"\)/,
  );
});

test("Planning/Pricing and Internal/Client use restrained animated segmented controls", async () => {
  const [response, globalStyles, primitiveStyles] = await Promise.all([
    renderPage(),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);
  const html = await response.text();

  assert.match(
    html,
    /class="view-toggle ui-segmented-control ui-control--md topbar-planning-switch"/i,
  );
  assert.match(
    html,
    /class="view-toggle ui-segmented-control ui-control--md topbar-view-toggle"/i,
  );
  assert.match(
    html,
    /aria-label="Pricing visibility"[\s\S]*?<button[^>]*aria-label="Pricing mode"[^>]*>Pricing<\/button><button[^>]*aria-label="Planning mode"[^>]*>Planning<\/button>/i,
  );
  assert.doesNotMatch(html, /ui-segmented-control__indicator/i);
  assert.match(
    globalStyles,
    /\.view-toggle::before\s*{[\s\S]*?width:\s*calc\(50% - 3px\)[\s\S]*?content:\s*""[\s\S]*?transition:\s*transform 220ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/i,
  );
  assert.match(
    globalStyles,
    /\.view-toggle\[data-view="client"\]::before,\s*\.view-toggle\[data-view="planning"\]::before\s*{[\s\S]*?transform:\s*translateX\(100%\)/i,
  );
  assert.match(
    globalStyles,
    /\.view-toggle button\.active\s*{[\s\S]*?background:\s*transparent/i,
  );
  assert.match(globalStyles, /\.view-toggle button\s*{[\s\S]*?min-height:\s*44px/i);
  assert.match(globalStyles, /\.view-toggle\s*{[\s\S]*?border:\s*0[\s\S]*?box-shadow:\s*inset 0 0 0 1px var\(--line\)/i);
  assert.match(
    globalStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.view-toggle::before,[\s\S]*?transition:\s*none !important/i,
  );
  assert.doesNotMatch(
    primitiveStyles,
    /\.ui-segmented-control\.view-toggle::before\s*{[\s\S]*?(?:display:\s*none|content:\s*none)/i,
  );
});

test("project settings controls use one standard shared size", async () => {
  const [response, settingsSource, noteSource, fieldSource, primitiveStyles] = await Promise.all([
    renderPage(),
    readFile(new URL("../features/project-planner/components/ProjectSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/ai-note.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/field.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);
  const html = await response.text();

  assert.doesNotMatch(settingsSource, /<NumberStepper\s+compact\b/i);
  assert.doesNotMatch(html, /compact-stepper/i);
  assert.match(settingsSource, /value:\s*["']RUB["']\s*,\s*label:\s*["']RUB — Russian Ruble["']/i);
  assert.doesNotMatch(settingsSource, /value:\s*["']GBP["']/i);
  assert.match(noteSource, /<MoneyInput[^>]*size=\{size\}/i);
  assert.match(noteSource, /trailingAction=\{\([\s\S]*?<AiNoteButton[\s\S]*?size=\{size\}/i);
  assert.match(
    fieldSource,
    /Boolean\(trailingAction\)\s*&&\s*["']ui-field__control--with-action["']/i,
  );
  assert.match(
    primitiveStyles,
    /\.ui-field__control--with-action\s*{[\s\S]*?display:\s*flex[\s\S]*?flex-flow:\s*row nowrap/i,
  );
  assert.match(
    primitiveStyles,
    /\.ui-field__control--with-action\s*>\s*\.ui-icon-button\s*{[\s\S]*?flex:\s*0 0/i,
  );
  assert.match(
    noteSource,
    /<div className=\{cn\([\s\S]*?"ui-noted-number-field"[\s\S]*?<AiNoteEditor[\s\S]*?<\/div>/i,
  );
});

test("glass hierarchy uses soft tonal separation without hard card dividers", async () => {
  const [globalStyles, primitiveStyles] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);

  const majorSurfaceRule =
    primitiveStyles.match(/\.ui-section-card\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(majorSurfaceRule, /border:\s*1px solid/);
  assert.match(majorSurfaceRule, /background:/);
  assert.match(majorSurfaceRule, /box-shadow:/);

  const metricSurfaceRule =
    primitiveStyles.match(
      /\.ui-summary-card\.metric-card,[\s\S]*?\.ui-summary-card\.metric-card\.featured\s*{[^}]*}/i,
    )?.[0] ?? "";
  assert.match(metricSurfaceRule, /border:\s*1px solid/i);
  assert.match(metricSurfaceRule, /border-radius:/i);
  assert.match(metricSurfaceRule, /background:/i);
  assert.match(metricSurfaceRule, /box-shadow:/i);

  assert.match(
    primitiveStyles,
    /\.ui-summary-card\.decision-kpi\s*{[^}]*border:\s*0[^}]*border-radius:\s*var\(--ui-radius-md\)[^}]*background:\s*var\(--ui-surface-soft-card\)[^}]*box-shadow:\s*none/i,
    "Analytics KPI cards should use the same soft surface as phase rows",
  );
  assert.match(
    primitiveStyles,
    /\.ui-summary-grid\.decision-kpi-grid\s*{[^}]*gap:\s*0\.75rem[^}]*border:\s*0[^}]*background:\s*transparent/i,
    "Analytics KPI cards should not sit inside another nested glass surface",
  );

  for (const selector of ["settings-column", "people-sidebar", "client-price"]) {
    const surfaceRule =
      globalStyles.match(new RegExp(`^\\.${selector}\\s*\\{[^}]*}`, "im"))?.[0] ?? "";
    assert.match(surfaceRule, /border:\s*1px solid/i, `${selector} should retain a glass frame`);
    assert.match(surfaceRule, /border-radius:/i);
    assert.match(surfaceRule, /background:/i);
  }
  assert.doesNotMatch(
    primitiveStyles,
    /\.settings-column\s*{[^}]*border:\s*0/i,
    "Functional settings and analytics panels should not be flattened globally",
  );
  const repeatedContentRule =
    primitiveStyles.match(/\.data-row,\s*\.person-card,\s*\.phase-row\s*{[^}]*}/i)?.[0] ?? "";
  assert.match(repeatedContentRule, /border:\s*0/i);
  assert.match(repeatedContentRule, /border-radius:\s*var\(--ui-radius-md\)/i);
  assert.match(repeatedContentRule, /background:\s*var\(--ui-surface-soft-card\)/i);
  assert.doesNotMatch(repeatedContentRule, /border-(?:top|right|bottom|left):/i);

  const phaseTotalsGroupRule =
    [
      ...primitiveStyles.matchAll(
        /\.ui-summary-grid\.phase-totals-summary\s*{[^}]*}/gi,
      ),
    ].at(-1)?.[0] ?? "";
  assert.match(phaseTotalsGroupRule, /border:\s*0/i);
  assert.match(phaseTotalsGroupRule, /border-radius:\s*var\(--ui-radius-md\)/i);
  assert.match(phaseTotalsGroupRule, /background:\s*var\(--ui-surface-soft-card\)/i);
  assert.doesNotMatch(phaseTotalsGroupRule, /border-(?:top|right|bottom|left):/i);
  assert.match(
    primitiveStyles,
    /\.pricing-hidden-state\s*{[^}]*min-height:\s*auto[^}]*border:\s*0[^}]*border-left:\s*2px solid[^}]*border-radius:\s*0[^}]*background:\s*transparent/i,
    "Planning mode's pricing notice should not reintroduce a nested glass box",
  );
  assert.match(
    primitiveStyles,
    /\.people-list\s*{[^}]*gap:\s*0\.5rem/i,
    "Person actions need separation when the list becomes a multi-column grid",
  );
  assert.match(
    primitiveStyles,
    /\.phase-row\s*\+\s*\.phase-row\s*{[^}]*margin-top:\s*0\.5rem/i,
    "Phase cards should use the same half-rem separation as the other card lists",
  );
  const flatPhaseTotalsRule =
    primitiveStyles.match(
      /\.ui-summary-card\.phase-total-item,[\s\S]*?\.ui-summary-card\.phase-total-price\s*{[^}]*}/i,
    )?.[0] ?? "";
  assert.match(flatPhaseTotalsRule, /border:\s*0/i);
  assert.doesNotMatch(
    flatPhaseTotalsRule,
    /border-left:/i,
    "Auto-fitting totals must not grow stray dividers when they wrap",
  );
  const clientMetricRule =
    primitiveStyles.match(/\.client-metrics\s*>\s*div\s*{[^}]*}/i)?.[0] ?? "";
  assert.match(clientMetricRule, /border:\s*0/i);
  assert.match(clientMetricRule, /border-radius:\s*var\(--ui-radius-md\)/i);
  assert.match(clientMetricRule, /background:\s*var\(--ui-surface-soft-card\)/i);
  assert.doesNotMatch(clientMetricRule, /border-(?:top|right|bottom|left):/i);
  for (const selector of [
    "\\.decision-breakdown\\s*>\\s*div",
    "\\.decision-facts\\s*>\\s*div",
  ]) {
    const analyticsRule =
      primitiveStyles.match(new RegExp(selector + "\\s*{[^}]*}", "i"))?.[0] ?? "";
    assert.match(analyticsRule, /border:\s*0/i);
    assert.match(analyticsRule, /border-radius:\s*var\(--ui-radius-md\)/i);
    assert.match(analyticsRule, /background:\s*var\(--ui-surface-soft-card\)/i);
  }
  assert.match(
    primitiveStyles,
    /\.cost-mix,\s*\.target-guide\s*{[^}]*border:\s*0[^}]*border-radius:\s*var\(--ui-radius-md\)[^}]*background:\s*var\(--ui-surface-soft-card\)/i,
  );
  assert.match(
    primitiveStyles,
    /@media print\s*{[\s\S]*?\.client-price\s*{[^}]*border:\s*1px solid #ded8e6[^}]*background:\s*#faf8fc/i,
    "Client print surfaces need visible boundaries on white paper",
  );
  assert.match(
    primitiveStyles,
    /@media print\s*{[\s\S]*?\.client-metrics\s*{[^}]*border-block:\s*0[^}]*}[\s\S]*?\.client-metrics\s*>\s*div\s*{[^}]*border:\s*1px solid #ded8e6/i,
  );
  assert.match(
    globalStyles,
    /\.assignment-zone\s*{[^}]*border:\s*1px dashed/i,
    "Interactive drag targets must remain visibly bounded",
  );
});

test("the live backdrop keeps its effects inside a bounded GPU budget", async () => {
  const [backdropSource, globalStyles, primitiveStyles] = await Promise.all([
    readFile(new URL("../components/app/AppBackdrop.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);

  assert.match(backdropSource, /const ACTIVE_FRAME_RATE = 30/);
  assert.match(backdropSource, /const IDLE_FRAME_RATE = 24/);
  assert.match(backdropSource, /const OBSCURED_FRAME_RATE = 12/);
  assert.match(backdropSource, /const MAX_CANVAS_PIXELS = 2_400_000/);
  assert.match(backdropSource, /Math\.min\(devicePixelRatio, pixelBudgetRatio\)/);
  assert.match(backdropSource, /Math\.min\(72, Math\.max\(38,/);
  assert.match(backdropSource, /const MAX_PARTICLE_CONNECTIONS = 2/);
  assert.match(backdropSource, /const PARTICLE_GRID_SIZE = 158/);
  assert.match(backdropSource, /new Int16Array\(particleCount\)/);
  assert.match(backdropSource, /createCometSprite\(color, length, thickness\)/);
  assert.match(backdropSource, /window\.addEventListener\("scroll", handleScroll/);
  assert.doesNotMatch(backdropSource, /shadowBlur/);
  assert.doesNotMatch(backdropSource, /RandomAmbientGlows/);
  assert.doesNotMatch(backdropSource, /new Map|new Set/);

  const canvasRule = globalStyles.match(/\.live-background-canvas\s*{[^}]*}/)?.[0] ?? "";
  assert.match(canvasRule, /filter:\s*none/);
  assert.match(canvasRule, /mix-blend-mode:\s*normal/);
  assert.doesNotMatch(globalStyles, /\.ambient(?:-[\w-]+)?\s*{/);

  const spectrumRule = globalStyles.match(/\.animated-backdrop::before\s*{[^}]*}/)?.[0] ?? "";
  assert.doesNotMatch(spectrumRule, /filter:|animation:|will-change:/);

  const glowRule = globalStyles.match(/\.backdrop-glow\s*{[^}]*}/)?.[0] ?? "";
  const glowPseudoRule = globalStyles.match(/\.backdrop-glow::before,[\s\S]*?\.backdrop-glow::after\s*{[^}]*}/)?.[0] ?? "";
  assert.doesNotMatch(glowRule, /animation:/);
  assert.doesNotMatch(glowPseudoRule, /animation:/);

  const topbarRule = globalStyles.match(/\.topbar\s*{[^}]*}/)?.[0] ?? "";
  assert.match(topbarRule, /^\s*backdrop-filter:\s*blur/m);
  assert.match(topbarRule, /^\s*-webkit-backdrop-filter:\s*blur/m);
  assert.doesNotMatch(
    globalStyles.replace(topbarRule, ""),
    /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm,
  );
  assert.doesNotMatch(primitiveStyles, /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm);

  const clientSheetRule = globalStyles.match(/\.client-sheet\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(clientSheetRule, /backdrop-filter:\s*none/);

  const sectionCardRule = primitiveStyles.match(/\.ui-section-card\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(sectionCardRule, /backdrop-filter:\s*none/);
});

test("the topbar stays compact and single-row until the narrow mobile breakpoint", async () => {
  const [topbarSource, globalStyles] = await Promise.all([
    readFile(new URL("../features/project-planner/components/Topbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const compactBreakpoint = globalStyles.indexOf("@media (max-width: 1280px)");
  const tabletBreakpoint = globalStyles.indexOf("@media (max-width: 1100px)");
  const actionCompactBreakpoint = globalStyles.indexOf("@media (max-width: 980px)");
  const smallTabletBreakpoint = globalStyles.indexOf("@media (max-width: 900px)");
  const mobileBreakpoint = globalStyles.indexOf("@media (max-width: 680px)");
  const narrowMobileBreakpoint = globalStyles.indexOf("@media (max-width: 620px)");
  const phoneBreakpoint = globalStyles.indexOf("@media (max-width: 440px)");
  const compactPlanningBreakpoint = globalStyles.indexOf("@media (max-width: 410px)");
  const ultraNarrowBreakpoint = globalStyles.indexOf("@media (max-width: 340px)");
  assert.ok(compactBreakpoint > 0);
  assert.ok(tabletBreakpoint > compactBreakpoint);
  assert.ok(actionCompactBreakpoint > tabletBreakpoint);
  assert.ok(smallTabletBreakpoint > actionCompactBreakpoint);
  assert.ok(mobileBreakpoint > smallTabletBreakpoint);
  assert.ok(narrowMobileBreakpoint > mobileBreakpoint);
  assert.ok(phoneBreakpoint > narrowMobileBreakpoint);
  assert.ok(compactPlanningBreakpoint > phoneBreakpoint);
  assert.ok(ultraNarrowBreakpoint > compactPlanningBreakpoint);

  const desktopStyles = globalStyles.slice(0, compactBreakpoint);
  const compactStyles = globalStyles.slice(compactBreakpoint, tabletBreakpoint);
  const tabletStyles = globalStyles.slice(tabletBreakpoint, actionCompactBreakpoint);
  const actionCompactStyles = globalStyles.slice(actionCompactBreakpoint, smallTabletBreakpoint);
  const smallTabletStyles = globalStyles.slice(smallTabletBreakpoint, mobileBreakpoint);
  const mobileStyles = globalStyles.slice(mobileBreakpoint, narrowMobileBreakpoint);
  const narrowMobileStyles = globalStyles.slice(narrowMobileBreakpoint, phoneBreakpoint);
  const phoneStyles = globalStyles.slice(phoneBreakpoint, compactPlanningBreakpoint);
  const compactPlanningStyles = globalStyles.slice(
    compactPlanningBreakpoint,
    ultraNarrowBreakpoint,
  );
  const ultraNarrowStyles = globalStyles.slice(
    ultraNarrowBreakpoint,
    globalStyles.indexOf("@media print"),
  );
  const topbarRule = desktopStyles.match(/\.topbar\s*{[^}]*}/)?.[0] ?? "";
  assert.match(topbarRule, /grid-template-areas:\s*"brand project actions"/);
  assert.match(topbarRule, /grid-template-columns:\s*auto minmax\(160px, 320px\) minmax\(0, 1fr\)/);
  assert.match(topbarRule, /min-height:\s*60px/);
  assert.match(
    desktopStyles,
    /\.topbar \.topbar-planning-toggle\.ui-button\.button\s*{[^}]*display:\s*none/,
  );
  assert.doesNotMatch(compactStyles, /grid-template-areas/);
  assert.doesNotMatch(tabletStyles, /grid-template-areas/);
  assert.doesNotMatch(smallTabletStyles, /grid-template-areas/);
  assert.match(mobileStyles, /grid-template-areas:\s*\n\s*"brand project"\s*\n\s*"actions actions"/);
  assert.match(mobileStyles, /grid-template-columns:\s*auto minmax\(0, 1fr\)/);
  const narrowTopbarActionsRule =
    narrowMobileStyles.match(/\.topbar-actions\s*{[^}]*}/)?.[0] ?? "";
  assert.doesNotMatch(narrowTopbarActionsRule, /flex-direction:\s*column/);
  assert.doesNotMatch(narrowMobileStyles, /\.ui-button__label[\s\S]*?display:\s*inline/);
  assert.match(phoneStyles, /\.topbar \.topbar-planning-toggle \.ui-button__label\s*{[^}]*display:\s*none/);
  assert.match(phoneStyles, /grid-template-columns:\s*repeat\(2, minmax\(3rem, 1fr\)\)/);
  assert.match(
    phoneStyles,
    /\.topbar \.topbar-planning-switch\s*{[^}]*grid-template-columns:\s*repeat\(2, minmax\(3\.75rem, 1fr\)\)/,
  );
  assert.match(
    compactPlanningStyles,
    /\.topbar \.topbar-planning-switch\s*{[^}]*display:\s*none/,
  );
  assert.match(
    compactPlanningStyles,
    /\.topbar \.topbar-planning-toggle\.ui-button\.button\s*{[^}]*display:\s*inline-flex/,
  );
  assert.match(ultraNarrowStyles, /\.topbar\s*{[^}]*padding-inline:\s*6px/);
  assert.match(
    ultraNarrowStyles,
    /grid-template-columns:\s*repeat\(2, minmax\(44px, 1fr\)\)/,
  );
  assert.match(ultraNarrowStyles, /\.file-actions\s*{[^}]*gap:\s*3px/);

  assert.doesNotMatch(compactStyles, /\.topbar \.file-actions \.ui-button__label[\s\S]*?display:\s*none/);
  assert.doesNotMatch(smallTabletStyles, /\.topbar \.file-actions \.ui-button__label[\s\S]*?display:\s*none/);
  assert.match(actionCompactStyles, /\.topbar \.file-actions \.ui-button__label\s*{[^}]*display:\s*none/);
  assert.match(actionCompactStyles, /\.topbar \.file-actions \.button\s*{[^}]*width:\s*44px/);
  assert.equal(topbarSource.match(/size="md"/g)?.length, 6);
  assert.doesNotMatch(topbarSource, /size="lg"/);
  assert.doesNotMatch(topbarSource, /<Switch\b|checkedDescription|uncheckedDescription/);
  assert.match(topbarSource, /className="topbar-planning-toggle"/);
  assert.match(topbarSource, /className="topbar-planning-switch"/);
  assert.match(topbarSource, /ariaLabel="Pricing visibility"/);
  assert.match(topbarSource, /value=\{planningMode \? "planning" : "pricing"\}/);
  assert.match(topbarSource, /nextPlanningMode !== planningMode/);
  assert.match(topbarSource, /onPlanningModeChange\(nextPlanningMode\)/);
  assert.match(topbarSource, /onPlanningModeChange\(!planningMode\)/);
  assert.doesNotMatch(topbarSource, /onTogglePlanningMode/);
  assert.match(topbarSource, /aria-label="Planning mode"/);
  assert.match(topbarSource, /aria-pressed=\{planningMode\}/);
  assert.match(topbarSource, /className="topbar-view-toggle"/);
  assert.match(topbarSource, /className="topbar-reset"/);
  assert.match(topbarSource, /aria-label="Reset all data"/);
  assert.match(topbarSource, /variant="ghost"[\s\S]*?className="topbar-import"/);
  assert.match(topbarSource, /variant="secondary"[\s\S]*?className="topbar-export"/);
  assert.doesNotMatch(topbarSource, /BriefcaseBusiness|Current project|project-identity-icon/);

  const projectIdentityRule =
    desktopStyles.match(/\.project-identity\s*{[^}]*}/)?.[0] ?? "";
  assert.match(projectIdentityRule, /max-width:\s*320px/);
  assert.match(projectIdentityRule, /min-height:\s*44px/);

  const projectNameRule =
    globalStyles.match(/\.project-identity input\s*{[^}]*}/)?.[0] ?? "";
  assert.match(projectNameRule, /min-width:\s*0/);
  assert.match(projectNameRule, /overflow:\s*hidden/);
  assert.match(projectNameRule, /text-overflow:\s*ellipsis/);
  assert.match(projectNameRule, /white-space:\s*nowrap/);

  const projectNameInput =
    topbarSource.match(/<TextInput\b[\s\S]*?\/>/)?.[0] ?? "";
  assert.match(projectNameInput, /aria-label="Project name"/);
  assert.match(projectNameInput, /title=\{projectName\}/);
  assert.match(projectNameInput, /value=\{projectName\}/);
});

test("core pricing features compose the shared UI primitives", async () => {
  const contracts = [
    ["../features/project-planner/ProjectPlanner.tsx", ["Toast"]],
    ["../features/project-planner/components/Topbar.tsx", ["Button", "SegmentedControl", "TextInput"]],
    [
      "../features/project-planner/components/ResetWorkspaceDialog.tsx",
      ["Button", "DialogActions", "Modal"],
    ],
    ["../features/project-planner/components/OverviewMetrics.tsx", ["SummaryCard"]],
    [
      "../features/project-planner/components/ProjectSettings.tsx",
      ["MoneyInput", "NumberStepper", "SectionCard"],
    ],
    [
      "../features/project-planner/components/PhasesStaffing.tsx",
      ["NumberStepper", "SectionCard"],
    ],
    [
      "../features/project-planner/components/DecisionAnalytics.tsx",
      ["SectionCard", "SummaryCard"],
    ],
    ["../features/project-planner/components/ExportDialog.tsx", ["ActionCard", "Modal"]],
    [
      "../features/project-planner/components/PersonEditorDialog.tsx",
      ["ColorPicker", "Field", "Modal", "MoneyInput"],
    ],
  ];

  for (const [relativePath, expectedPrimitives] of contracts) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    const sharedImport = source.match(
      /import\s*{([^}]*)}\s*from\s*["']@\/components\/ui["'];?/,
    );
    assert.ok(sharedImport, `${relativePath} must import from the shared UI barrel`);
    for (const primitive of expectedPrimitives) {
      assert.match(
        sharedImport[1],
        new RegExp(`\\b${escapeRegExp(primitive)}\\b`),
        `${relativePath} must compose ${primitive}`,
      );
    }
  }
});
