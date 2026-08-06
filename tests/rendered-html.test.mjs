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

test("fresh SSR is useful, accessible, and fail-closed for pricing", async () => {
  const response = await renderPage();
  const html = await response.text();
  const text = visibleText(html);

  assert.equal(response.status, 200);
  assertVisible(text, [
    "VOXE",
    "GROUP",
    "Planning mode",
    "Pricing hidden",
    "Import",
    "Export",
    "Delivery plan",
    "40 days",
    "Scheduled effort",
    "518h",
    "Project settings",
    "Pricing controls hidden",
    "Schedule & time",
    "Effort adjustments",
    "Phases & staffing",
    "People",
    "Phases",
    "Project duration",
    "40 workdays",
    "54 calendar days",
    "Unique team members",
  ]);

  assertNotVisible(text, [
    "Client quote",
    "Estimated cost",
    "Gross profit",
    "Gross margin",
    "Decision analytics",
    "Quote reconciliation",
    "Cost & pricing guide",
    "Base price / hour",
    "Fixed starting fee",
    "Manual price adjustment",
    "Internal hourly cost",
    "Expenses",
    "Cloud development environment",
    "AI sandbox usage",
    "AI integration complexity",
    "Labor cost",
    "Total project price",
  ]);
  assert.doesNotMatch(text, /\$\s*\d/, "Pricing amounts must not be visible before reveal");

  assert.match(
    html,
    /<button(?=[^>]*\brole="switch")(?=[^>]*\baria-checked="true")(?=[^>]*\baria-label="Turn off planning mode and show pricing")[^>]*>/i,
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
  assert.match(html, /aria-label="Project start date"[^>]*aria-haspopup="dialog"/i);
  assert.match(html, /aria-label="Add effort adjustment"/i);
  assert.match(html, /aria-label="Add AI notes for Delivery contingency"/i);
  assert.match(html, /aria-label="Add person"/i);
  assert.match(html, /aria-label="Add phase"/i);
  assert.match(html, /aria-label="Phase totals"/i);
  assert.match(html, /aria-labelledby="phases-staffing-title"/i);
  for (const panel of ["Commercial", "Effort adjustments", "People", "Phases"]) {
    assert.match(html, new RegExp(`aria-label="Maximize ${escapeRegExp(panel)}"`, "i"));
  }
  assert.match(html, /aria-label="Maximize Schedule and time"/i);
});

test("route composition and privacy state live behind explicit module boundaries", async () => {
  const [route, studio, workspaceHook, normalization] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/pricing/PricingStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/pricing/hooks/usePricingWorkspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pricing/normalization.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    route,
    /import\s*{\s*PricingStudio\s*}\s*from\s*["']@\/features\/pricing\/PricingStudio["']/,
  );
  assert.match(route, /return\s*<PricingStudio\s*\/>/);
  assert.match(studio, /export\s+function\s+PricingStudio\s*\(/);
  assert.match(studio, /usePricingWorkspace\s*\(/);

  assert.match(
    workspaceHook,
    /setPlanningMode\s*\(\s*parsePlanningMode\s*\(\s*localStorage\.getItem\s*\(\s*PLANNING_MODE_KEY\s*\)\s*\)\s*\)/,
  );
  assert.match(
    normalization,
    /export\s+const\s+parsePlanningMode\s*=\s*\(storedValue:\s*unknown\):\s*boolean\s*=>\s*storedValue\s*!==\s*["']false["']/,
  );
});

test("Internal and Client use one animated sliding switch layer", async () => {
  const [response, globalStyles, primitiveStyles] = await Promise.all([
    renderPage(),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);
  const html = await response.text();

  assert.match(html, /class="view-toggle ui-segmented-control ui-control--lg"/i);
  assert.doesNotMatch(html, /ui-segmented-control__indicator/i);
  assert.match(globalStyles, /\.view-toggle::before\s*{[\s\S]*?transition:\s*transform/i);
  assert.match(
    globalStyles,
    /\.view-toggle\[data-view="client"\]::before\s*{\s*transform:\s*translateX\(100%\)/i,
  );
  assert.doesNotMatch(
    primitiveStyles,
    /\.ui-segmented-control\.view-toggle::before\s*{[\s\S]*?(?:display:\s*none|content:\s*none)/i,
  );
});

test("project settings controls use one standard shared size", async () => {
  const [response, settingsSource, noteSource, fieldSource, primitiveStyles] = await Promise.all([
    renderPage(),
    readFile(new URL("../features/pricing/components/ProjectSettings.tsx", import.meta.url), "utf8"),
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
  assert.doesNotMatch(globalStyles, /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm);
  assert.doesNotMatch(primitiveStyles, /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm);

  const clientSheetRule = globalStyles.match(/\.client-sheet\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(clientSheetRule, /backdrop-filter:\s*none/);

  const sectionCardRule = primitiveStyles.match(/\.ui-section-card\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(sectionCardRule, /backdrop-filter:\s*none/);
});

test("core pricing features compose the shared UI primitives", async () => {
  const contracts = [
    ["../features/pricing/PricingStudio.tsx", ["Toast"]],
    ["../features/pricing/components/Topbar.tsx", ["Button", "Switch"]],
    ["../features/pricing/components/OverviewMetrics.tsx", ["SummaryCard"]],
    [
      "../features/pricing/components/ProjectSettings.tsx",
      ["MoneyInput", "NumberStepper", "SectionCard"],
    ],
    [
      "../features/pricing/components/PhasesStaffing.tsx",
      ["NumberStepper", "SectionCard"],
    ],
    [
      "../features/pricing/components/DecisionAnalytics.tsx",
      ["SectionCard", "SummaryCard"],
    ],
    ["../features/pricing/components/ExportDialog.tsx", ["ActionCard", "Modal"]],
    [
      "../features/pricing/components/PersonEditorDialog.tsx",
      ["ColorPicker", "Field", "Modal", "MoneyInput"],
    ],
    ["../features/pricing/components/RevealPricingDialog.tsx", ["Button", "Modal"]],
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
