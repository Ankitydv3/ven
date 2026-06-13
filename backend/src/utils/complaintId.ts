import Counter from "../models/Counter";

export async function generateComplaintId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `complaint-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `complaint-${year}` } },
    { new: true, upsert: true }
  );

  return `CMP-${year}-${String(counter.value).padStart(3, "0")}`;
}