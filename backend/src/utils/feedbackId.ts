import Counter from "../models/Counter";

export async function generateFeedbackId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `feedback-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `feedback-${year}` } },
    { new: true, upsert: true }
  );

  return `FDB-${year}-${String(counter.value).padStart(3, "0")}`;
}
