import Counter from "../models/Counter";

export async function generateMaterialRequestId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `material-request-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `material-request-${year}` } },
    { new: true, upsert: true }
  );

  return `MR-${year}-${String(counter.value).padStart(4, "0")}`;
}
