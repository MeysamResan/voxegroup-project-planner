export function downloadJson(value: unknown, filename: string): void {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new TypeError("Value cannot be serialized as JSON");

  const blob = new Blob([serialized], { type: "application/json;charset=utf-8" });
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(blob);
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}
