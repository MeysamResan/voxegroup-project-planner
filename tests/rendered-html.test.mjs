import assert from "node:assert/strict";
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
  assert.match(html, /\bImport\b/i);
  assert.match(html, /Pricing controls hidden/i);
  assert.match(html, /Project settings/i);
  assert.match(html, /Effort adjustments/i);
  assert.match(html, /aria-label="Add AI notes for Delivery contingency"/i);
  for (const panel of ["Commercial", "Schedule and time", "Effort adjustments", "People", "Phases"]) {
    assert.match(html, new RegExp(`aria-label="Maximize ${panel}"`, "i"));
  }
  assert.match(html, /aria-label="Project start date"[^>]*aria-haspopup="dialog"/i);
  assert.doesNotMatch(html, /type="date"/i);
  assert.doesNotMatch(html, /elastic-(?:pair|panel)|dragging-person/i);
  assert.doesNotMatch(html, /\b0[1-5]\s*•/);
  assert.doesNotMatch(html, /Local only|Saved on this device|>\s*(?:Pricing|Planning) Studio\s*</i);
  assert.doesNotMatch(html, /id="expenses-settings-title"/i);
  assert.doesNotMatch(html, /aria-label="Maximize Expenses"/i);
  assert.doesNotMatch(
    html,
    /Client quote|Estimated cost|Gross profit|Financial pulse|Estimated investment|Internal hourly cost|Cloud development environment|AI sandbox usage|AI integration complexity/i,
  );
});
