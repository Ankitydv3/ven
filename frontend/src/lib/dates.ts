/** Parse an `<input type="date">` value (yyyy-MM-dd) as local midnight — avoids UTC shift. */
export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Today's date as yyyy-MM-dd in the user's local timezone. */
export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when `value` is after today (local calendar), not including today. */
export function isDateInputInFuture(value: string): boolean {
  const selected = parseDateInputValue(value);
  const today = parseDateInputValue(getTodayDateInputValue());
  return selected.getTime() > today.getTime();
}
