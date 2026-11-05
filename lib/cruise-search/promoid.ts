/** 4gates promo id (e.g. BESTFARE). Not cabins_key= or empty promoid=. */
export const PROMOID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function isValidPromoid(value: unknown): value is string {
  return typeof value === "string" && PROMOID_PATTERN.test(value.trim());
}

export function sanitizePromoid(value: unknown): string | undefined {
  if (!isValidPromoid(value)) return undefined;
  return value.trim();
}
