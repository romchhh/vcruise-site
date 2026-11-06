export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

export const MONTH_NAMES_FULL = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
] as const;

export function formatIso(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Monday-based calendar grid for a month (includes leading/trailing blanks as null). */
export function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayIndex = (first.getDay() + 6) % 7;
  const cells: Array<number | null> = [];

  for (let i = 0; i < mondayIndex; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function formatShortDate(iso: string) {
  const { year, month, day } = parseIso(iso);
  const yy = String(year).slice(2);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${dd}.${mm}.${yy}`;
}

/** dd.mm.yyyy for search date range field */
export function formatFullDate(iso: string) {
  const { year, month, day } = parseIso(iso);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${dd}.${mm}.${year}`;
}

export function parseFullDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number.parseInt(dd, 10);
  const month = Number.parseInt(mm, 10);
  const year = Number.parseInt(yyyy, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = formatIso(year, month - 1, day);
  const check = parseIso(iso);
  if (check.day !== day || check.month !== month - 1 || check.year !== year) {
    return null;
  }
  return iso;
}

export const WEEKDAY_LABELS_SUN = [
  "Нд",
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
] as const;

export type CalendarDayCell = {
  year: number;
  month: number;
  day: number;
  outside: boolean;
  iso: string;
};

/** Sunday-start grid with leading/trailing days from adjacent months. */
export function getMonthDayCells(year: number, month: number): CalendarDayCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cursor = new Date(first);
  cursor.setDate(first.getDate() - first.getDay());

  const cells: CalendarDayCell[] = [];
  while (cells.length < 42) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    cells.push({
      year: y,
      month: m,
      day: d,
      outside: m !== month,
      iso: formatIso(y, m, d),
    });
    cursor.setDate(cursor.getDate() + 1);
    if (cells.length >= 42 && cursor > last && cursor.getDay() === 0) break;
  }
  return cells;
}
