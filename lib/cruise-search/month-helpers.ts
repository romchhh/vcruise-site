import { MONTH_INDEX, MONTH_LABELS } from "./constants";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
