/** KST (Korea Standard Time) week grouping utilities */

export const KST_OFFSET_MINUTES = 540; // UTC+9

function normalizeDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

/**
 * Returns a stable week key (YYYY-Www) for a given date using the specified TZ offset.
 * Week starts on Monday (ISO week).
 */
export function weekKeyTZ(dateInput: Date | string | number, offsetMinutes: number): string {
  const date = normalizeDate(dateInput);
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const d = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Returns a KST-based week key */
export function weekKeyKST(dateInput: Date | string | number): string {
  return weekKeyTZ(dateInput, KST_OFFSET_MINUTES);
}

/**
 * Groups rows by week (using the given TZ offset) and computes average value per week.
 * Returns sorted arrays of { weekKey, avg, count }.
 */
export function groupWeeklyAverageWithOffset<T>(
  rows: T[],
  getDate: (row: T) => Date | string | number,
  getValue: (row: T) => number,
  offsetMinutes: number
): { weekKey: string; avg: number; count: number }[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    const weekKey = weekKeyTZ(getDate(row), offsetMinutes);
    const value = getValue(row);
    const existing = map.get(weekKey) ?? { sum: 0, count: 0 };
    existing.sum += value;
    existing.count += 1;
    map.set(weekKey, existing);
  }

  return Array.from(map.entries())
    .map(([weekKey, bucket]) => ({
      weekKey,
      avg: bucket.count > 0 ? bucket.sum / bucket.count : 0,
      count: bucket.count,
    }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/** Groups weekly averages in KST */
export function groupWeeklyAverageKST<T>(
  rows: T[],
  getDate: (row: T) => Date | string | number,
  getValue: (row: T) => number
) {
  return groupWeeklyAverageWithOffset(rows, getDate, getValue, KST_OFFSET_MINUTES);
}

/** Get the current KST week key */
export function currentWeekKeyKST(): string {
  return weekKeyKST(new Date());
}
