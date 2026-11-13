import { MONTH_INDEX, MONTH_LABELS } from "./constants";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ISO date window for selected year + month chips.
 * Used to push month filters to 4gates `dates` so live search does not scan a whole year.
 */
export function dateRangeFromYearMonths(
  year: string,
  months: string[],
  referenceDate = new Date(),
): { from: string; to: string } | null {
  if (!months.length) return null;

  const indices = months
    .map((label) => MONTH_INDEX[label])
    .filter((index): index is number => index !== undefined)
    .sort((left, right) => left - right);
  if (!indices.length) return null;

  const selectedYear =
    year && year !== "Будь-коли"
      ? Number(year)
      : referenceDate.getFullYear();
  if (!Number.isFinite(selectedYear)) return null;

  const startMonth = indices[0];
  const endMonth = indices[indices.length - 1];
  const from = `${selectedYear}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(selectedYear, endMonth + 1, 0)).getUTCDate();
  const to = `${selectedYear}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function isMonthSelectable(
  monthLabel: string,
  year: string,
  referenceDate = new Date()
) {
  const monthIndex = MONTH_INDEX[monthLabel];
  if (monthIndex === undefined) return false;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  if (year === "Будь-коли") {
    return monthIndex >= currentMonth;
  }

  const selectedYear = Number(year);
  if (!Number.isFinite(selectedYear)) return true;

  if (selectedYear > currentYear) return true;
  if (selectedYear < currentYear) return false;

  return monthIndex >= currentMonth;
}

export function getSelectableMonths(
  year: string,
  referenceDate = new Date()
) {
  return MONTH_LABELS.filter((month) =>
    isMonthSelectable(month, year, referenceDate)
  );
}

export function sanitizeSelectedMonths(
  months: string[],
  year: string,
  referenceDate = new Date()
) {
  return months.filter((month) =>
    isMonthSelectable(month, year, referenceDate)
  );
}

/** Year context for month chips when the year dropdown is hidden (dates take precedence). */
export function effectiveMonthYear(
  year: string,
  dateFrom = "",
  dateTo = "",
) {
  if (dateFrom.length >= 4) return dateFrom.slice(0, 4);
  if (dateTo.length >= 4) return dateTo.slice(0, 4);
  return year;
}
