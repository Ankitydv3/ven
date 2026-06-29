import Counter from "../models/Counter";

export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: number }).code;
  return code === 11000;
}

export async function ensureCounterAtLeast(key: string, minValue: number) {
  if (minValue <= 0) return;

  const existing = await Counter.findOne({ key }).lean();
  if (!existing || existing.value < minValue) {
    await Counter.findOneAndUpdate({ key }, { $set: { value: minValue } }, { upsert: true });
  }
}

export async function nextCounterValue(key: string) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 }, $setOnInsert: { key } },
    { new: true, upsert: true }
  );

  return counter.value;
}

export function parseSequenceSuffix(id: string, pattern: RegExp) {
  const match = id.match(pattern);
  if (!match?.[1]) return 0;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : 0;
}
