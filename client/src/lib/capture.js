export function readCapture(searchParams) {
  const hashCapture = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.hash.slice(1)).get("capture");
  const rawCapture = hashCapture || searchParams.get("capture");
  if (!rawCapture || rawCapture.length > 20_000) return null;

  try {
    const capture = JSON.parse(rawCapture);
    return capture && typeof capture === "object" && !Array.isArray(capture)
      ? capture
      : null;
  } catch {
    return null;
  }
}

export function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
