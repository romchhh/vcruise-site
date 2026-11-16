/** 4gates shortens long itineraries with a leading "… " / "... " on a port. */
export function normalizeRouteStop(raw: string) {
  return raw.replace(/^[.…]+\s*/u, "").trim();
}

export function isSeaDayStop(raw: string) {
  const name = normalizeRouteStop(raw).split(",")[0]?.trim() ?? "";
  return name === "В морі" || /^в море$/i.test(name);
}

export function parseRouteText(text: string) {
  return text
    .split(/\s+-\s+/)
    .map((part) => normalizeRouteStop(part))
    .filter(Boolean);
}
