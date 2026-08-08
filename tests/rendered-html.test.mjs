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
    "Phase effort",
    "5 selected",
    "Modifiers",
    "Expenses",
    "Phases & staffing",
    "People",
    "Phases",
    "Sub-phases",
    "Add sub-phase",
    "Delivery mix",
    "Team",
    "Cost",
    "Quote",
    "09/08/2026",
    "27/10/2026",
    "DD/MM/YYYY",
    "Decision analytics",
    "Quote reconciliation",
    "Cost & pricing guide",
    "Final quote",
  ]);
  assert.match(html, /aria-label="Reset all data"/i);
  assert.match(html, /aria-label="Import project"/i);

  assertNotVisible(text, [
    "Pricing controls hidden",
    "Team planning brief",
    "August 9, 2026",
    "Aug 9, 2026",
    "October 27, 2026",
    "Oct 27, 2026",
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
  assert.match(html, /aria-label="Add a sub-phase to Discovery &amp; architecture"/i);
  assert.match(html, /aria-controls="phase-tasks-phase-discovery-architecture"/i);
  assert.match(html, /aria-label="Delivery overview"/i);
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
  assert.match(
    planner,
    /const openNewPerson = useCallback\([\s\S]*?color: nextPersonColor\(people\)[\s\S]*?\}, \[people\]\)/,
  );

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

test("color theme follows the device by default and overrides only for the current page", async () => {
  const [response, themeHook, planner, topbar, layout, globalStyles, primitiveStyles] =
    await Promise.all([
      renderPage(),
      readFile(
        new URL("../features/project-planner/hooks/useColorTheme.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../features/project-planner/ProjectPlanner.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../features/project-planner/components/Topbar.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
    ]);
  const html = await response.text();
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";

  assert.doesNotMatch(htmlTag, /\bdata-theme=/i, "SSR must leave the device scheme in control");
  assert.match(
    html,
    /<button(?=[^>]*\bclass="[^"]*topbar-theme-toggle)(?=[^>]*\bdata-theme="dark")(?=[^>]*\baria-label="Switch to light mode")[^>]*>/i,
  );
  assert.match(html, /class="theme-toggle-icons"/i);
  assert.match(html, /class="lucide lucide-sun theme-toggle-icon theme-toggle-sun"/i);
  assert.match(html, /class="lucide lucide-moon theme-toggle-icon theme-toggle-moon"/i);

  assert.match(themeHook, /const SYSTEM_THEME_QUERY = "\(prefers-color-scheme: light\)"/);
  assert.match(
    themeHook,
    /const \[themeOverride, setThemeOverride\] = useState<ColorTheme \| null>\(null\)/,
  );
  assert.match(themeHook, /const theme = themeOverride \?\? systemTheme/);
  assert.match(themeHook, /window\.matchMedia\(SYSTEM_THEME_QUERY\)/);
  assert.match(themeHook, /query\.addEventListener\("change", syncSystemTheme\)/);
  assert.match(themeHook, /document\.documentElement\.dataset\.theme = nextTheme/);
  assert.match(themeHook, /delete document\.documentElement\.dataset\.theme/);
  assert.doesNotMatch(themeHook, /localStorage|sessionStorage|JSON\.(?:parse|stringify)/);

  assert.match(planner, /useColorTheme\(\)/);
  assert.match(planner, /resetTheme\(\)/);
  assert.match(planner, /theme=\{theme\}/);
  assert.match(planner, /usingSystemTheme=\{usingSystemTheme\}/);
  assert.match(planner, /onThemeToggle=\{toggleTheme\}/);
  assert.match(topbar, /className="topbar-theme-toggle"/);

  assert.match(globalStyles, /html\s*{[^}]*color-scheme:\s*light dark/);
  assert.match(globalStyles, /html\[data-theme="light"\]\s*{[^}]*color-scheme:\s*light/);
  assert.match(globalStyles, /html\[data-theme="dark"\]\s*{[^}]*color-scheme:\s*dark/);
  assert.match(
    globalStyles,
    /@media \(prefers-color-scheme: light\)\s*{\s*html:not\(\[data-theme\]\)/,
  );
  assert.match(globalStyles, /--background:\s*light-dark\(#f2eff7, #0a0712\)/);
  assert.match(globalStyles, /--glass-backdrop-filter:\s*none/);
  assert.match(
    globalStyles,
    /html\[data-theme="light"\]\s*{[^}]*--canvas-blend:\s*normal[^}]*--glass-backdrop-filter:\s*none/,
  );
  assert.match(
    globalStyles,
    /@media \(prefers-color-scheme: light\)\s*{\s*html:not\(\[data-theme\]\)\s*{[^}]*--glass-backdrop-filter:\s*none/,
  );
  assert.match(
    globalStyles,
    /--glass-background:\s*linear-gradient\([\s\S]*?rgba\(255, 255, 255, 0\.78\)[\s\S]*?rgba\(238, 233, 245, 0\.66\)/,
  );
  assert.match(globalStyles, /\.topbar-theme-toggle\.ui-icon-button\s*{/);
  assert.doesNotMatch(globalStyles, /\.theme-toggle-icon\s*{[^}]*transition:/);
  assert.match(primitiveStyles, /System-aware light\/dark adaptation/);
  assert.match(primitiveStyles, /\.ui-modal\.modal[^}]*background:\s*var\(--dialog-background\)/s);

  assert.match(
    layout,
    /media:\s*"\(prefers-color-scheme: light\)",\s*color:\s*"#f2eff7"/,
  );
  assert.match(
    layout,
    /media:\s*"\(prefers-color-scheme: dark\)",\s*color:\s*"#0a0712"/,
  );
});

test("theme changes crossfade colors without moving interface layers", async () => {
  const [themeHook, globalStyles] = await Promise.all([
    readFile(
      new URL("../features/project-planner/hooks/useColorTheme.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    themeHook,
    /const REDUCED_MOTION_QUERY = "\(prefers-reduced-motion: reduce\)"/,
  );
  assert.match(themeHook, /window\.matchMedia\(REDUCED_MOTION_QUERY\)\.matches/);
  assert.match(themeHook, /root\.classList\.add\("theme-transition-active"\)/);
  assert.match(themeHook, /transitionDocument\.startViewTransition/);
  assert.match(themeHook, /transition\.finished\.then\(finishTransition, finishTransition\)/);
  assert.doesNotMatch(
    themeHook,
    /THEME_TRANSITION_LAYERS|theme-transition-layer|theme-transition-fallback|view-transition-name|getBoundingClientRect/,
  );
  assert.match(themeHook, /pauseAppMotion\(\)/);
  assert.match(themeHook, /resumeAppMotion\(\)/);

  assert.match(
    globalStyles,
    /html\.theme-transition-active::view-transition-old\(root\)\s*{[^}]*animation:\s*theme-color-fade-out 180ms ease both/,
  );
  assert.match(
    globalStyles,
    /html\.theme-transition-active::view-transition-new\(root\)\s*{[^}]*animation:\s*theme-color-fade-in 180ms ease both/,
  );
  const themeTransitionStyles = globalStyles.slice(
    globalStyles.indexOf("html.theme-transition-active"),
    globalStyles.indexOf("@media (prefers-color-scheme: light)"),
  );
  assert.doesNotMatch(
    themeTransitionStyles,
    /transform:|translate|scale|theme-glass|theme-workspace|--theme-layer-delay/,
  );
  assert.doesNotMatch(globalStyles, /theme-transition-fallback|theme-transition-layer/);
  assert.match(
    globalStyles,
    /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?::view-transition-group\(\*\),[\s\S]*?::view-transition-new\(\*\)\s*{[^}]*animation:\s*none !important;/,
  );
  assert.doesNotMatch(globalStyles, /theme-scheme-reveal|clip-path:\s*circle\(/);
});

test("matte light surfaces avoid live blur while retaining layered contrast", async () => {
  const [globalStyles, primitiveStyles] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);

  const alphaFrom = (source, pattern, label) => {
    const match = source.match(pattern);
    assert.ok(match, `Missing light alpha contract for ${label}`);
    return Number(match[1]);
  };
  const outerGlassAlpha = alphaFrom(
    globalStyles,
    /--glass-background:\s*linear-gradient\([\s\S]*?light-dark\(rgba\(255, 255, 255, ([\d.]+)\)/,
    "outer glass",
  );
  const settingsAlpha = alphaFrom(
    primitiveStyles,
    /:is\(\s*\.settings-column,\s*\.people-sidebar,\s*\.client-price\s*\)\s*{[\s\S]*?background:\s*linear-gradient\([\s\S]*?light-dark\(rgba\(255, 255, 255, ([\d.]+)\)/,
    "settings panels",
  );
  const summaryAlpha = alphaFrom(
    primitiveStyles,
    /:is\(\.ui-summary-card, \.ui-summary-card--default\)\s*{[\s\S]*?light-dark\(rgba\(255, 255, 255, ([\d.]+)\)/,
    "summary cards",
  );
  const softCardAlpha = alphaFrom(
    primitiveStyles,
    /--ui-surface-soft-card:\s*linear-gradient\([\s\S]*?light-dark\(rgba\(255, 255, 255, ([\d.]+)\)/,
    "row cards",
  );
  const metricAlpha = alphaFrom(
    globalStyles,
    /\.metric-card\.glass-panel\s*{[\s\S]*?light-dark\(rgba\(255, 255, 255, ([\d.]+)\)/,
    "metric cards",
  );

  assert.ok(outerGlassAlpha >= 0.7, "Outer light surfaces must remain readable without blur");
  assert.ok(metricAlpha >= 0.7, "Light metric cards must not depend on backdrop sampling");
  assert.ok(settingsAlpha <= 0.1, "Nested settings retain subtle tonal separation");
  assert.ok(summaryAlpha <= 0.12, "Nested summaries retain subtle tonal separation");
  assert.ok(softCardAlpha <= 0.08, "Rows remain lighter than a solid card stack");

  assert.match(
    globalStyles,
    /html\[data-theme="light"\]\s*{[^}]*--canvas-opacity:\s*0\.56/,
  );
  assert.match(
    globalStyles,
    /\.animated-backdrop\s*{[\s\S]*?background:\s*linear-gradient\([\s\S]*?light-dark\(#faf8fc, #0c0914\)[\s\S]*?light-dark\(#f1edf7, #08060e\)/,
  );
  assert.doesNotMatch(globalStyles, /\.animated-backdrop::before/);
});

test("date pickers, selects, and dialogs share the light glass system", async () => {
  const [globalStyles, primitiveStyles, datePickerSource] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/glass-date-picker.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(
    globalStyles,
    /--popover-background:\s*linear-gradient\([\s\S]*?rgba\(255, 255, 255, 0\.96\)[\s\S]*?rgba\(242, 238, 247, 0\.92\)/,
  );
  assert.match(
    globalStyles,
    /--dialog-background:\s*linear-gradient\([\s\S]*?rgba\(255, 255, 255, 0\.97\)[\s\S]*?rgba\(242, 238, 247, 0\.94\)/,
  );
  assert.match(
    globalStyles,
    /html\[data-theme="light"\]\s*{[^}]*--popover-backdrop-filter:\s*none[^}]*--dialog-backdrop-filter:\s*none/,
  );
  assert.match(
    globalStyles,
    /--modal-overlay:\s*light-dark\(rgba\(38, 27, 48, 0\.18\), rgba\(4, 2, 8, 0\.82\)\)/,
  );

  const selectMenuRule =
    primitiveStyles.match(/\.ui-select__menu\.glass-select-menu\s*{[^}]*}/)?.[0] ?? "";
  assert.match(selectMenuRule, /background:\s*var\(--popover-background\)/);
  assert.match(
    selectMenuRule,
    /backdrop-filter:\s*var\(--popover-backdrop-filter\)/,
  );

  const dateMenuRule =
    primitiveStyles.match(/\.ui-date-picker__menu\.glass-date-menu\s*{[^}]*}/)?.[0] ?? "";
  assert.match(dateMenuRule, /var\(--popover-background\)/);
  assert.match(
    dateMenuRule,
    /backdrop-filter:\s*var\(--popover-backdrop-filter\)/,
  );

  const modalRule =
    primitiveStyles.match(/\.ui-modal\.modal\s*{[^}]*}/)?.[0] ?? "";
  assert.match(modalRule, /background:\s*var\(--dialog-background\)/);
  assert.match(modalRule, /backdrop-filter:\s*var\(--dialog-backdrop-filter\)/);

  const selectedDayRule =
    primitiveStyles.match(
      /\.ui-date-picker__menu \.glass-calendar-day\.selected\s*{[^}]*}/,
    )?.[0] ?? "";
  assert.match(selectedDayRule, /background:\s*linear-gradient/);
  assert.match(selectedDayRule, /color:\s*#fff/);
  assert.match(datePickerSource, /placeholder = "DD\/MM\/YYYY"/);
  assert.match(datePickerSource, /selectedDate \? displayDate\(selectedDate\) : placeholder/);
  assert.match(datePickerSource, /return `\$\{day\}\/\$\{month\}\/\$\{date\.getFullYear\(\)\}`/);
});

test("saved notes keep the violet button and use only the green status dot", async () => {
  const [response, globalStyles, primitiveStyles] = await Promise.all([
    renderPage(),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);
  const html = await response.text();

  assert.match(
    html,
    /<button(?=[^>]*\bclass="[^"]*note-button[^"]*has-notes)[^>]*>/i,
    "The preset should exercise the saved-note state",
  );

  const savedNoteRule =
    globalStyles.match(/\.note-button\.has-notes\s*{[^}]*}/)?.[0] ?? "";
  assert.match(savedNoteRule, /border-color:\s*rgba\(168, 140, 255, 0\.2\)/);
  assert.match(savedNoteRule, /background:\s*rgba\(132, 91, 239, 0\.075\)/);
  assert.match(savedNoteRule, /color:\s*#bba9e8/);

  const noteThemeRule =
    primitiveStyles.match(
      /:is\(\.note-button,\s*\.note-button\.has-notes\)\s*{[^}]*}/,
    )?.[0] ?? "";
  assert.match(noteThemeRule, /background:\s*var\(--accent-soft\)/);
  assert.match(noteThemeRule, /color:\s*var\(--ui-color-violet\)/);
  assert.doesNotMatch(
    primitiveStyles,
    /:is\(\s*\.modifier-target-chip,\s*\.note-button\.has-notes/,
  );

  const noteDotRule =
    globalStyles.match(/\.note-button\.has-notes::after\s*{[^}]*}/)?.[0] ?? "";
  assert.match(noteDotRule, /width:\s*6px/);
  assert.match(noteDotRule, /height:\s*6px/);
  assert.match(noteDotRule, /background:\s*var\(--green\)/);
});

test("Planning/Pricing and Internal/Client use polished directional transitions", async () => {
  const [response, globalStyles, primitiveStyles, plannerSource, transitionHook] = await Promise.all([
    renderPage(),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
    readFile(
      new URL("../features/project-planner/ProjectPlanner.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/project-planner/hooks/useWorkspaceTransition.ts", import.meta.url),
      "utf8",
    ),
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
    /\.view-toggle::before\s*{[\s\S]*?width:\s*calc\(50% - 3px\)[\s\S]*?content:\s*""[\s\S]*?transition:\s*transform 300ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/i,
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
  assert.match(plannerSource, /const runWorkspaceTransition = useWorkspaceTransition\(\)/);
  assert.match(
    plannerSource,
    /nextPlanningMode \? "forward" : "backward"/,
  );
  assert.match(
    plannerSource,
    /nextView === "client" \? "forward" : "backward"/,
  );
  assert.match(plannerSource, /onViewChange=\{changeView\}/);
  assert.match(
    plannerSource,
    /className="workspace-content"[\s\S]*?data-workspace-view=\{view\}[\s\S]*?data-pricing-visibility=/,
  );
  assert.match(transitionHook, /flushSync\(update\)/);
  assert.match(transitionHook, /window\.matchMedia\(REDUCED_MOTION_QUERY\)\.matches/);
  assert.match(
    transitionHook,
    /const offset = direction === "forward" \? 14 : -14/,
  );
  assert.match(
    transitionHook,
    /content\.animate\([\s\S]*?opacity:\s*0\.42[\s\S]*?translate3d\(\$\{offset\}px, 0, 0\)[\s\S]*?duration:\s*WORKSPACE_TRANSITION_DURATION_MS/,
  );
  assert.match(transitionHook, /const WORKSPACE_TRANSITION_DURATION_MS = 360/);
  assert.match(
    transitionHook,
    /const WORKSPACE_TRANSITION_EASING = "cubic-bezier\(0\.22, 1, 0\.36, 1\)"/,
  );
  assert.match(transitionHook, /animation\.finished\.then\(releaseAnimation, releaseAnimation\)/);
  assert.doesNotMatch(transitionHook, /startViewTransition|APP_MOTION|getBoundingClientRect/);
  assert.match(
    globalStyles,
    /\.view-toggle button\.active\s*{[\s\S]*?transform:\s*translateY\(-1px\)/,
  );
  assert.doesNotMatch(globalStyles, /workspace-transition-(?:active|forward|backward)|workspace-content-in-/);
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

test("numeric controls enforce calculation bounds before updating project state", async () => {
  const [stepperSource, phasesSource] = await Promise.all([
    readFile(new URL("../components/ui/number-stepper.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/project-planner/components/PhasesStaffing.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(
    stepperSource,
    /const normalized = normalizeValue\(parsed, min, max\);\s*if \(!Object\.is\(normalized, value\)\) onChange\(normalized\)/,
    "Typed values must respect min/max before they reach live calculations",
  );
  assert.match(
    phasesSource,
    /days:\s*Math\.max\(0, Math\.round\(days\)\)/,
    "Phase duration state must use whole, non-negative workdays",
  );
});

test("sub-phases use synced durations and parent-aware avatar staffing", async () => {
  const [
    typesSource,
    reducerSource,
    normalizationSource,
    calculationSource,
    phasesSource,
    globalStyles,
    primitiveStyles,
  ] =
    await Promise.all([
      readFile(new URL("../lib/pricing/types.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/pricing/workspace.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/pricing/normalization.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/pricing/calculation.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../features/project-planner/components/PhasesStaffing.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
    ]);

  assert.match(typesSource, /export type PhaseTask = \{[\s\S]*?notes: string[\s\S]*?days: number[\s\S]*?assignments: Assignment\[\]/);
  assert.match(typesSource, /export type Phase = \{[\s\S]*?notes: string[\s\S]*?tasks: PhaseTask\[\]/);
  assert.match(typesSource, /taskResults: PhaseTaskResult\[\]/);
  assert.match(reducerSource, /type: "phase-task\/assign-person"/);
  assert.match(reducerSource, /if \(!phaseHasPerson \|\| taskHasPerson\) return workspace/);
  assert.doesNotMatch(reducerSource, /assignmentsIncludingTasks/);
  assert.match(reducerSource, /days: tasks\.reduce\(\(sum, phaseTask\) => sum \+ phaseTask\.days, 0\)/);
  assert.match(
    normalizationSource,
    /normalizePhaseTasks\(item\.tasks, importedDays, assignedPersonIds\)/,
  );
  assert.match(calculationSource, /taskResults: raw\.taskScheduleData\.map/);
  assert.match(phasesSource, /<span>Sub-phases<\/span>/);
  assert.match(phasesSource, /placeholder="Sub-phase name"/);
  assert.match(phasesSource, /onDrop=\{\(event\) => handleTaskDrop\(event, phase, task\)\}/);
  assert.match(phasesSource, /Drop people/);
  assert.match(phasesSource, /className="phase-task-days"[\s\S]*?\{ days: Math\.max\(0, Math\.round\(days\)\) \}/);
  assert.match(phasesSource, /taskResult\?\.start/);
  assert.match(phasesSource, /is-task-unavailable/);
  assert.match(phasesSource, /Not assigned to \$\{taskPhase\?\.name\}/);
  assert.match(phasesSource, /className="phase-duration-summary"/);
  assert.match(phasesSource, /className="phase-days-stepper"/);
  assert.match(phasesSource, /<AiNoteButton[\s\S]*?hasNotes=\{Boolean\(phase\.notes\.trim\(\)\)\}/);
  assert.match(phasesSource, /<AiNoteButton[\s\S]*?hasNotes=\{Boolean\(task\.notes\.trim\(\)\)\}/);
  assert.match(phasesSource, /className="phase-notes-editor"/);
  assert.match(phasesSource, /className="phase-task-notes-editor"/);
  assert.doesNotMatch(phasesSource, /suffix="d"/);
  assert.match(phasesSource, /className="phase-days-heading">Days<\/span>/);
  assert.match(globalStyles, /\.phase-days-heading\s*{[^}]*text-align:\s*center/i);
  assert.match(
    globalStyles,
    /\.phase-number-heading,\s*\.phase-number\s*{[^}]*text-align:\s*center/i,
  );
  assert.match(globalStyles, /\.phase-duration-summary\s*{[^}]*border:\s*0/i);
  assert.match(globalStyles, /\.phase-task-row\s*{[^}]*grid-template-columns:\s*var\(--phase-table-columns\)/i);
  assert.match(
    primitiveStyles,
    /\.ui-number-stepper\.phase-days-stepper,[\s\S]*?\.ui-number-stepper\.phase-task-days[\s\S]*?--ui-control-height:\s*var\(--ui-control-height-md\)[\s\S]*?grid-template-columns:\s*2rem minmax\(2rem, 1fr\) 2rem/i,
  );
  assert.match(
    primitiveStyles,
    /\.ui-number-stepper\.phase-task-days[\s\S]*?> button:last-child\s*{[^}]*grid-column:\s*3[^}]*width:\s*2rem/i,
  );
  assert.match(globalStyles, /--phase-action-column-width:\s*114px/);
  assert.match(globalStyles, /--phase-action-controls-width:\s*98px/);
  assert.match(globalStyles, /--phase-table-min-width:\s*1112px/);
  assert.match(globalStyles, /\.phase-table\.planning-phase-table\s*{[^}]*--phase-table-min-width:\s*992px/i);
  assert.match(
    globalStyles,
    /\.phase-task-list\s*{[^}]*gap:\s*6px[^}]*overflow:\s*visible[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none/i,
  );
  assert.match(
    globalStyles,
    /\.phase-task-row\s*{[^}]*border:\s*0[^}]*border-radius:\s*var\(--ui-radius-md\)[^}]*background:\s*transparent[^}]*box-shadow:\s*none/i,
  );
  assert.match(globalStyles, /\.phase-task-row \+ \.phase-task-row\s*{[^}]*border-top:\s*0/i);
  assert.match(phasesSource, /<AssignmentAvatar[\s\S]*?source=\{\{ phaseId: phase\.id, taskId: null \}\}/);
  assert.match(phasesSource, /<AssignmentAvatar[\s\S]*?source=\{\{ phaseId: phase\.id, taskId: task\.id \}\}/);
  assert.doesNotMatch(phasesSource, /taskSize|is-task-avatar/);
  assert.doesNotMatch(phasesSource, /className="phase-task-name"\s+controlSize="sm"/);
  assert.doesNotMatch(phasesSource, /assignment-person-name|title=\{`Remove \$\{person\.name\}/);
  assert.match(phasesSource, /className="assignment-person-popover"[\s\S]*?role="dialog"/);
  assert.match(phasesSource, /data-person-assignment-drop-zone="true"/);
  assert.match(phasesSource, /assignmentDropHandledRef\.current = false;[\s\S]*?onUnassignPerson\(source\.phaseId, source\.personId\)/);
  assert.match(phasesSource, /event\.dataTransfer\.setDragImage\(hiddenDragImage, 0, 0\)/);
  assert.match(phasesSource, /className=\{`assignment-drag-preview\$\{/);
  assert.match(globalStyles, /\.assignment-avatar\s*{[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border-radius:\s*999px/i);
  assert.match(
    globalStyles,
    /\.phase-task-assignees\s*{[^}]*min-height:\s*var\(--ui-control-height-md\)[^}]*border:\s*1px dashed var\(--line\)/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row-actions,\s*\.phase-task-actions\s*{[^}]*width:\s*var\(--phase-action-controls-width\)[^}]*gap:\s*10px/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row-actions > \.ui-icon-button,\s*\.phase-task-actions > \.ui-icon-button\s*{[^}]*width:\s*44px[^}]*height:\s*44px/i,
  );
  assert.doesNotMatch(primitiveStyles, /\.phase-task-remove\.ui-icon-button--danger\.icon-button/);
  assert.match(globalStyles, /\.phase-task-row\s*{[^}]*padding:\s*var\(--ui-space-2\) 0/i);
  assert.match(globalStyles, /\.phase-task-days\.ui-number-stepper\s*{[^}]*--ui-control-height:\s*var\(--ui-control-height-md\)[^}]*min-height:\s*var\(--ui-control-height-md\)/i);
  assert.match(phasesSource, /className="phase-task-days"[\s\S]*?size="md"/);
  assert.match(globalStyles, /\.assignment-avatar\.is-dragging\s*{[^}]*border-style:\s*dashed[^}]*opacity:\s*0\.46/i);
  assert.doesNotMatch(globalStyles, /\.assignment-avatar\.is-remove-armed\s*{/i);
  assert.match(
    globalStyles,
    /\.assignment-drag-preview\.is-remove-armed \.assignment-drag-preview-avatar\s*{[^}]*background:\s*#dd4c63[^}]*animation:\s*assignment-drag-avatar-remove-shake 380ms/i,
  );
  assert.doesNotMatch(phasesSource, /assignment-drag-preview-remove/);
  assert.doesNotMatch(globalStyles, /\.assignment-drag-preview-remove/);
  assert.match(
    globalStyles,
    /\.assignment-drag-preview\.is-removing \.assignment-drag-preview-avatar\s*{[^}]*animation:\s*assignment-drag-avatar-remove-out 220ms/i,
  );
  assert.match(globalStyles, /@keyframes assignment-drag-avatar-remove-out/);
  assert.match(globalStyles, /@keyframes assignment-drag-avatar-remove-shake/);
  assert.match(phasesSource, /document\.addEventListener\("pointerdown", handlePointerDown, true\)/);
  assert.match(phasesSource, /selectedTaskRowRef\.current\?\.contains\(target\)/);
  assert.match(globalStyles, /\.assignment-person-popover\s*{[^}]*position:\s*fixed/i);
  assert.doesNotMatch(phasesSource, /Sub-phases &amp; tasks|Name this sub-phase or task|days synced/);
  assert.doesNotMatch(phasesSource, /GlassSelect|Assign person/);
  assert.match(globalStyles, /\.phase-task-section\s*\{[^}]*grid-column:\s*1 \/ -1/i);
  assert.match(globalStyles, /\.phase-task-assignees\.drop-active/);
  assert.match(globalStyles, /\.person-card\.is-task-unavailable\s*{[^}]*opacity:\s*0\.42/i);
  assert.match(globalStyles, /@keyframes phase-task-reveal/);
});

test("phase overview replaces verbose totals with a compact delivery chart", async () => {
  const [phasesSource, globalStyles] = await Promise.all([
    readFile(
      new URL("../features/project-planner/components/PhasesStaffing.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(phasesSource, /className="phase-overview-track"[\s\S]*?project\.phases\.map/);
  assert.match(
    phasesSource,
    /style=\{\{[\s\S]*?\.\.\.phaseToneStyle\(index\),[\s\S]*?flexGrow: Math\.max\(phase\.days, 0\.25\)/,
  );
  assert.match(
    phasesSource,
    /className="phase-overview-duration"[\s\S]*?<strong>\{calculation\.totalWorkingDays\}<\/strong>[\s\S]*?<small>working days<\/small>[\s\S]*?<strong>\{calculation\.calendarDays\}<\/strong>[\s\S]*?<small>calendar days<\/small>/,
  );
  assert.match(
    phasesSource,
    /className="phase-overview-title"[\s\S]*?<h3>Delivery mix<\/h3>[\s\S]*?calculation\.totalHours/,
  );
  assert.doesNotMatch(phasesSource, /phase-overview-stats/);
  assert.match(phasesSource, /onClick=\{\(\) => onPhaseSelect\(phase\.id\)\}/);
  assert.match(
    phasesSource,
    /className="phase-overview-range"[\s\S]*?<small>Start<\/small>[\s\S]*?longDate\(calculation\.projectStart\)[\s\S]*?<small>End<\/small>[\s\S]*?longDate\(calculation\.projectEnd\)/,
  );
  assert.match(
    phasesSource,
    /phaseRow\.scrollIntoView\(\{[\s\S]*?behavior: reduceMotion \? "auto" : "smooth"[\s\S]*?inline: "nearest"/,
  );
  assert.doesNotMatch(phasesSource, /phaseNameInput|preventScroll|\.select\(\)/);
  assert.equal(
    phasesSource.match(/phase-tone-\$\{\s*\(index % PHASE_TONES\.length\) \+ 1\s*\}/g)?.length,
    2,
    "phase rows and their delivery segments should use the same rotating tone",
  );
  assert.equal(
    phasesSource.match(/phaseToneStyle\(index\)/g)?.length,
    2,
    "phase rows and delivery segments should receive the same theme-aware tone variables",
  );
  assert.match(
    phasesSource,
    /<dt>Team<\/dt>[\s\S]*?<dt>Labor cost<\/dt>[\s\S]*?<dt>Quote<\/dt>/,
  );
  assert.doesNotMatch(
    phasesSource,
    /Scheduled delivery effort|Unique team members|Calculated staffing cost|Final quote including commercial adjustments"\s*\n\s*detail=/,
  );
  assert.doesNotMatch(phasesSource, /<SummaryGrid|<SummaryCard/);
  assert.match(
    globalStyles,
    /\.phase-overview\s*{[^}]*grid-template-columns:\s*minmax\(340px, 1fr\) auto[^}]*padding:\s*16px 18px 15px/i,
  );
  assert.match(
    globalStyles,
    /\.phase-overview-duration\s*{[^}]*border-radius:\s*12px[^}]*background:\s*light-dark/i,
  );
  assert.match(
    globalStyles,
    /\[class\*="phase-tone-"\]\s*\{[^}]*--phase-color:\s*light-dark\([^}]*var\(--phase-color-light[^}]*var\(--phase-color-dark/i,
  );
  assert.doesNotMatch(globalStyles, /\.phase-tone-\d+\s*\{/);
  assert.match(
    globalStyles,
    /\.phase-overview-segment\s*\{[^}]*background:\s*var\(--phase-color/i,
  );
  assert.match(
    globalStyles,
    /\.phase-overview-segment\s*\{[^}]*appearance:\s*none[^}]*cursor:\s*pointer/i,
  );
  assert.match(
    globalStyles,
    /\.phase-overview-range\s*\{[^}]*justify-content:\s*space-between/i,
  );
  assert.match(
    globalStyles,
    /\.phase-overview-metrics\s*\{[^}]*border-radius:\s*14px[^}]*background:\s*light-dark/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row\[class\*="phase-tone-"\]\.is-overview-target\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--phase-color\)/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row\[class\*="phase-tone-"\] \.phase-name-cell b\s*\{[^}]*color:\s*var\(--phase-color\)/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row\[class\*="phase-tone-"\] \.phase-date,\s*\.phase-row\[class\*="phase-tone-"\] \.phase-task-date\s*\{[^}]*color:\s*var\(--phase-color\)/i,
  );
  assert.match(
    globalStyles,
    /\.phase-row\[class\*="phase-tone-"\] \.phase-date > svg,\s*\.phase-row\[class\*="phase-tone-"\] \.phase-task-date i\s*\{[^}]*color:\s*var\(--phase-color\)/i,
  );
  assert.doesNotMatch(globalStyles, /\.phase-overview-segment:nth-child/);
  assert.match(
    globalStyles,
    /@media \(max-width:\s*900px\)[\s\S]*?\.phase-overview\s*{[^}]*grid-template-columns:\s*1fr/i,
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

  const phaseOverviewRule =
    globalStyles.match(/\.phase-overview\s*{[^}]*}/i)?.[0] ?? "";
  assert.match(phaseOverviewRule, /border:\s*0/i);
  assert.match(phaseOverviewRule, /border-radius:\s*18px/i);
  assert.match(phaseOverviewRule, /background:\s*linear-gradient/i);
  assert.doesNotMatch(phaseOverviewRule, /border-(?:top|right|bottom|left):/i);
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
  const phaseTrackRule =
    globalStyles.match(/\.phase-overview-track\s*{[^}]*}/i)?.[0] ?? "";
  assert.match(phaseTrackRule, /display:\s*flex/i);
  assert.match(phaseTrackRule, /height:\s*16px/i);
  assert.match(phaseTrackRule, /border-radius:\s*var\(--ui-radius-pill\)/i);
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

test("the live backdrop and theme-aware glass effects stay bounded", async () => {
  const [backdropSource, globalStyles, primitiveStyles] = await Promise.all([
    readFile(new URL("../components/app/AppBackdrop.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/primitives.css", import.meta.url), "utf8"),
  ]);

  assert.match(backdropSource, /const DARK_FRAME_RATE = 12/);
  assert.match(backdropSource, /const LIGHT_FRAME_RATE = 10/);
  assert.match(backdropSource, /const POWER_SAVER_FRAME_RATE = 6/);
  assert.match(backdropSource, /const MAX_BACKING_SCALE = 0\.58/);
  assert.match(backdropSource, /const MAX_CANVAS_PIXELS = 360_000/);
  assert.match(backdropSource, /const MESH_SPRITE_SIZE = 128/);
  const meshBlueprint = backdropSource.match(
    /const MESH_BLOBS:[\s\S]*?= \[([\s\S]*?)\n\];/,
  )?.[1] ?? "";
  assert.equal((meshBlueprint.match(/\bcolor:/g) ?? []).length, 4);
  assert.match(
    backdropSource,
    /MESH_BLOBS\.map\(\(blob\) => \(\{[\s\S]*?sprite: createMeshSprite\(blob\.color\)/,
  );
  assert.equal(
    (backdropSource.match(/createMeshSprite\(blob\.color\)/g) ?? []).length,
    1,
  );
  const drawMeshSource = backdropSource.match(
    /const drawMesh = \(\) => \{([\s\S]*?)\n    \};\n\n    const resize/,
  )?.[1] ?? "";
  assert.doesNotMatch(drawMeshSource, /createMeshSprite|createRadialGradient|createElement/);
  assert.match(backdropSource, /Math\.min\(deviceScale, budgetScale\)/);
  assert.match(
    backdropSource,
    /Math\.sqrt\(MAX_CANVAS_PIXELS \/ Math\.max\(1, width \* height\)\)/,
  );
  assert.match(backdropSource, /canvas\.width = Math\.max\(1, Math\.floor\(width \* backingScale\)\)/);
  assert.match(backdropSource, /context\.imageSmoothingQuality = "low"/);
  assert.match(backdropSource, /const powerSaver = Boolean\(/);
  assert.match(backdropSource, /performanceNavigator\.connection\?\.saveData/);
  assert.match(backdropSource, /performanceNavigator\.deviceMemory <= 4/);
  assert.match(backdropSource, /performanceNavigator\.hardwareConcurrency <= 4/);
  assert.match(backdropSource, /let staticMotion = motionPreference\.matches/);
  assert.doesNotMatch(backdropSource, /staticMotion\s*=\s*[^;\n]*powerSaver/);
  assert.match(
    backdropSource,
    /const handleMotionPreference[\s\S]*?staticMotion = event\.matches;[\s\S]*?start\(\)/,
  );
  assert.match(backdropSource, /if \(powerSaver\) return POWER_SAVER_FRAME_INTERVAL/);
  assert.match(
    backdropSource,
    /return lightThemeActive\(\) \? LIGHT_FRAME_INTERVAL : DARK_FRAME_INTERVAL/,
  );
  assert.match(backdropSource, /if \(!staticMotion\) scheduleNextFrame\(frameInterval\(\)\)/);
  assert.match(backdropSource, /Math\.min\(elapsed, MAX_FRAME_DELTA\)/);
  assert.match(backdropSource, /new IntersectionObserver/);
  assert.match(backdropSource, /new MutationObserver/);
  const canRenderSource = backdropSource.match(
    /const canRender = \(\) => \(([\s\S]*?)\n    \);/,
  )?.[1] ?? "";
  for (const condition of [
    /canvasVisible/,
    /!document\.hidden/,
    /windowFocused/,
    /!isPrinting/,
    /!isScrolling/,
    /!themeTransitionPaused/,
  ]) {
    assert.match(canRenderSource, condition);
  }
  for (const listener of [
    /window\.addEventListener\("scroll", handleScroll/,
    /window\.addEventListener\("blur", handleWindowBlur/,
    /window\.addEventListener\("focus", handleWindowFocus/,
    /window\.addEventListener\("beforeprint", handleBeforePrint/,
    /window\.addEventListener\("afterprint", handleAfterPrint/,
    /window\.addEventListener\(APP_MOTION_PAUSE_EVENT/,
    /window\.addEventListener\(APP_MOTION_RESUME_EVENT/,
    /document\.addEventListener\("visibilitychange", handleVisibility/,
  ]) {
    assert.match(backdropSource, listener);
  }
  assert.match(backdropSource, /intersectionObserver\?\.disconnect\(\)/);
  assert.match(backdropSource, /themeObserver\?\.disconnect\(\)/);
  assert.match(backdropSource, /window\.removeEventListener\("scroll", handleScroll\)/);
  assert.match(backdropSource, /document\.removeEventListener\("visibilitychange", handleVisibility\)/);
  assert.match(backdropSource, /themeTransitionPaused = true;\s*stop\(\)/);
  assert.doesNotMatch(
    backdropSource,
    /type Particle|type Comet|\bparticles\s*=|\bcomets\s*=|PARTICLE_|drawParticles|drawRibbon|drawComets|createParticleSprite|createCometSprite|pointerSprite|pointerX|pointerY|pointermove|shadowBlur/i,
  );
  assert.doesNotMatch(
    backdropSource,
    /AMBIENT_MOTION_WINDOW|SCROLL_MOTION_WINDOW|ambientUntil|activeUntil|wakeAmbient/,
  );
  assert.doesNotMatch(backdropSource, /backdrop-glow/);

  const canvasRule = globalStyles.match(/\.live-background-canvas\s*{[^}]*}/)?.[0] ?? "";
  assert.match(canvasRule, /filter:\s*none/);
  assert.match(canvasRule, /opacity:\s*var\(--canvas-opacity\)/);
  assert.match(canvasRule, /mix-blend-mode:\s*var\(--canvas-blend\)/);
  assert.doesNotMatch(globalStyles, /\.ambient(?:-[\w-]+)?\s*{/);

  const gridRule = globalStyles.match(/\.backdrop-grid\s*{[^}]*}/)?.[0] ?? "";
  assert.doesNotMatch(gridRule, /filter:|animation:|will-change:/);
  assert.doesNotMatch(globalStyles, /\.backdrop-glow|\.animated-backdrop::before/);

  const topbarRule = globalStyles.match(/\.topbar\s*{[^}]*}/)?.[0] ?? "";
  assert.match(topbarRule, /^\s*backdrop-filter:\s*none/m);
  assert.match(topbarRule, /^\s*-webkit-backdrop-filter:\s*none/m);
  assert.doesNotMatch(
    globalStyles,
    /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm,
  );
  assert.doesNotMatch(primitiveStyles, /^\s*(?:-webkit-)?backdrop-filter:\s*blur/gm);

  const clientSheetRule = globalStyles.match(/\.client-sheet\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(clientSheetRule, /backdrop-filter:\s*var\(--glass-backdrop-filter\)/);

  const sectionCardRule = primitiveStyles.match(/\.ui-section-card\.glass-panel\s*{[^}]*}/)?.[0] ?? "";
  assert.match(sectionCardRule, /backdrop-filter:\s*var\(--glass-backdrop-filter\)/);
  assert.match(
    primitiveStyles,
    /:is\(\s*\.settings-column,\s*\.people-sidebar,\s*\.client-price\s*\)\s*{[^}]*backdrop-filter:\s*none/,
  );
});

test("rendering work stays scoped to visible and changed interface regions", async () => {
  const [plannerSource, globalStyles, layoutSource, panelButtonSource] = await Promise.all([
    readFile(
      new URL("../features/project-planner/ProjectPlanner.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/ui/panel-size-button.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const component of [
    "AppBackdrop",
    "ClientEstimate",
    "DecisionAnalytics",
    "OverviewMetrics",
    "PhasesStaffing",
    "ProjectSettings",
    "Topbar",
  ]) {
    assert.match(plannerSource, new RegExp(`const Stable${component} = memo\\(${component}\\)`));
  }
  assert.match(plannerSource, /const inputKey = useMemo\([\s\S]*?calculationInputKey\(project, people\)/);
  assert.match(globalStyles, /@supports \(content-visibility: auto\)/);
  assert.match(globalStyles, /\.settings-card:not\(\.has-maximized-panel\)[^}]*content-visibility:\s*auto/s);
  assert.match(globalStyles, /\.decision-card[^}]*contain-intrinsic-size:\s*auto 760px/s);
  assert.match(panelButtonSource, /view-transition-name", "active-panel"/);
  assert.doesNotMatch(globalStyles, /view-transition-name:\s*(?:project-settings|delivery-plan)-card/);
  assert.doesNotMatch(layoutSource, /Geist_Mono|font-geist-mono/);
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
  const compactPlanningBreakpoint = globalStyles.indexOf("@media (max-width: 460px)");
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
  assert.match(topbarRule, /grid-template-columns:\s*auto minmax\(180px, 1fr\) auto/);
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
    /grid-template-columns:\s*repeat\(2, minmax\(38px, 1fr\)\)/,
  );
  assert.match(
    ultraNarrowStyles,
    /\.topbar \.topbar-theme-toggle\.ui-icon-button,[\s\S]*?width:\s*38px[^}]*min-width:\s*38px[^}]*min-height:\s*38px[^}]*height:\s*38px/,
  );
  assert.match(ultraNarrowStyles, /\.file-actions\s*{[^}]*gap:\s*2px/);
  assert.match(
    ultraNarrowStyles,
    /\.topbar \.topbar-utility-actions\s*\{[^}]*display:\s*none/,
  );

  assert.doesNotMatch(compactStyles, /\.topbar \.file-actions \.ui-button__label[\s\S]*?display:\s*none/);
  assert.doesNotMatch(smallTabletStyles, /\.topbar \.file-actions \.ui-button__label[\s\S]*?display:\s*none/);
  assert.match(actionCompactStyles, /\.topbar \.file-actions \.ui-button__label\s*{[^}]*display:\s*none/);
  assert.match(actionCompactStyles, /\.topbar \.file-actions \.button\s*{[^}]*width:\s*44px/);
  assert.equal(topbarSource.match(/size="md"/g)?.length, 8);
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
  assert.match(topbarSource, /<IconButton[\s\S]*?className="topbar-theme-toggle"/);
  assert.match(topbarSource, /data-theme=\{theme\}/);
  assert.match(topbarSource, /label=\{`Switch to \$\{theme === "dark" \? "light" : "dark"\} mode`\}/);
  assert.match(topbarSource, /className="theme-toggle-icons"/);
  assert.match(topbarSource, /className="topbar-reset"/);
  assert.match(topbarSource, /label="Reset all data"/);
  assert.match(topbarSource, /className="topbar-utility-actions"/);
  assert.match(topbarSource, /variant="ghost"[\s\S]*?className="topbar-import"/);
  assert.match(topbarSource, /variant="secondary"[\s\S]*?className="topbar-export"/);
  assert.match(topbarSource, /className="topbar-export"[\s\S]*?className="topbar-assistant"/);
  assert.match(topbarSource, /aria-controls="project-assistant-drawer"/);
  assert.match(topbarSource, /aria-expanded=\{assistantOpen\}/);
  assert.match(topbarSource, /<BotMessageSquare size=\{19\} \/>/);
  assert.match(topbarSource, /className="topbar-assistant-sparkle"/);
  assert.doesNotMatch(topbarSource, />\s*Notes & AI\s*</);
  assert.doesNotMatch(topbarSource, /BriefcaseBusiness|Current project|project-identity-icon/);

  const utilityActionRule = globalStyles.match(
    /\.topbar \.topbar-reset\.ui-icon-button,[\s\S]*?\.topbar \.topbar-import\.ui-icon-button\s*\{[^}]*}/,
  )?.[0] ?? "";
  assert.match(utilityActionRule, /width:\s*44px/);
  assert.match(utilityActionRule, /min-width:\s*44px/);
  assert.match(utilityActionRule, /min-height:\s*44px/);
  assert.match(utilityActionRule, /height:\s*44px/);

  const projectIdentityRule =
    desktopStyles.match(/\.project-identity\s*{[^}]*}/)?.[0] ?? "";
  assert.match(projectIdentityRule, /max-width:\s*360px/);
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

test("the project assistant stays docked while the workspace remains usable", async () => {
  const [response, drawerSource, plannerSource, phasesSource, globalStyles] = await Promise.all([
    renderPage(),
    readFile(
      new URL(
        "../features/project-planner/components/ProjectAssistantDrawer.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../features/project-planner/ProjectPlanner.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../features/project-planner/components/PhasesStaffing.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const html = await response.text();

  assert.match(
    html,
    /<button(?=[^>]*\bclass="[^"]*topbar-assistant)(?=[^>]*\baria-label="Open project copilot")(?=[^>]*\baria-expanded="false")[^>]*>/i,
  );
  assert.doesNotMatch(visibleText(html), /Notes & AI/i);
  assert.match(plannerSource, /const \[assistantOpen, setAssistantOpen\] = useState\(false\)/);
  assert.match(plannerSource, /assistantOpen \? " assistant-dock-open" : ""/);
  assert.match(plannerSource, /<StablePhasesStaffing[\s\S]*?assistantOpen=\{assistantOpen\}/);
  assert.match(plannerSource, /patchProject\(\{ assistantNotesMarkdown \}\)/);
  assert.match(plannerSource, /markdown=\{project\.assistantNotesMarkdown\}/);
  assert.match(plannerSource, /lazy\(async \(\) => \{[\s\S]*?import\("\.\/components\/ProjectAssistantDrawer"\)/);
  assert.match(plannerSource, /onMarkdownDraftChange=\{stageAssistantNotes\}/);
  assert.match(drawerSource, /<aside[\s\S]*?id="project-assistant-drawer"/);
  assert.match(drawerSource, /aria-labelledby="project-assistant-title"/);
  assert.match(drawerSource, /<h2 id="project-assistant-title">Notes & AI<\/h2>/);
  assert.match(drawerSource, /label="Close project copilot"/);
  assert.match(drawerSource, /event\.key !== "Escape"/);
  assert.doesNotMatch(drawerSource, /<Modal|modal-backdrop|backdropClassName/);
  assert.match(drawerSource, /aria-label="Project note in Markdown"/);
  assert.match(drawerSource, /const NOTE_SAVE_DELAY_MS = 600/);
  assert.match(drawerSource, /<MarkdownPreview value=\{noteDraft\} \/>/);
  assert.match(drawerSource, /onBlur=\{\(\) => commitNote\(\)\}/);
  assert.match(drawerSource, /id="assistant-note-content"/);
  assert.match(drawerSource, /aria-labelledby=\{`assistant-note-\$\{noteView\}-tab`\}/);
  assert.match(drawerSource, /disabled=\{!aiConnected\}/);
  assert.match(drawerSource, /Connect an AI provider to start chatting/);
  assert.match(
    globalStyles,
    /\.project-assistant-layout\s*\{[^}]*grid-template-rows:\s*minmax\(0, 7fr\) minmax\(210px, 3fr\)/,
  );
  assert.match(
    globalStyles,
    /\.project-assistant-dock\s*\{[^}]*position:\s*fixed[^}]*top:\s*12px[^}]*right:\s*12px[^}]*bottom:\s*12px/,
  );
  assert.match(
    globalStyles,
    /\.app-shell\.assistant-dock-open\s*\{[^}]*padding-right:\s*calc\(var\(--assistant-dock-width\) \+ 24px\)/,
  );
  assert.match(phasesSource, /const compactPeopleRail = assistantOpen && maximizedPanel === null/);
  assert.match(phasesSource, /label=\{railExpanded \? "Collapse people sidebar" : "Expand people sidebar"\}/);
  assert.match(phasesSource, /document\.addEventListener\("pointerdown", handlePointerDown\)/);
  assert.match(
    globalStyles,
    /\.delivery-workspace\.has-people-rail\s*\{[^}]*grid-template-columns:\s*76px minmax\(0, 1fr\)/,
  );
  assert.match(
    globalStyles,
    /\.people-sidebar\.is-compact\s*\{[^}]*width:\s*300px[^}]*clip-path:\s*inset\(0 224px 0 0 round 18px\)/,
  );
  assert.match(
    globalStyles,
    /\.people-sidebar\.is-compact\.is-rail-expanded\s*\{[^}]*clip-path:\s*inset\(0 round 18px\)/,
  );
  assert.match(
    globalStyles,
    /\.settings-extensions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.doesNotMatch(globalStyles, /\.assistant-dock-open \.settings-extensions/);
});

test("core pricing features compose the shared UI primitives", async () => {
  const contracts = [
    ["../features/project-planner/ProjectPlanner.tsx", ["Toast"]],
    ["../features/project-planner/components/Topbar.tsx", ["Button", "IconButton", "SegmentedControl", "TextInput"]],
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
      "../features/project-planner/components/ProjectAssistantDrawer.tsx",
      ["Button", "IconButton", "TextArea"],
    ],
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
