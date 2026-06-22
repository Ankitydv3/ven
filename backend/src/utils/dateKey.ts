const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const match = DATE_KEY_RE.exec(key);
  if (!match) {
    throw new Error(`Invalid date key: ${key}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function dateKeyFromValue(value: string | Date) {
  if (value instanceof Date) {
    return toDateKey(value);
  }
  if (DATE_KEY_RE.test(value)) {
    return value;
  }
  return toDateKey(new Date(value));
}

export function startOfDateKey(key: string) {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return new Date(key);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

export function endOfDateKey(key: string) {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return new Date(key);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
}

export function todayDateKey() {
  return toDateKey(new Date());
}

export function isDateKeyBefore(a: string, b: string) {
  return a < b;
}

export const PRIORITY_RANK: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

export function dominantPriority(counts: Record<string, number>) {
  let best = "Medium";
  let bestRank = 0;
  for (const [priority, count] of Object.entries(counts)) {
    if (count > 0 && (PRIORITY_RANK[priority] ?? 0) >= bestRank) {
      best = priority;
      bestRank = PRIORITY_RANK[priority] ?? 0;
    }
  }
  return best;
}
