import Counter from "../models/Counter";

export async function generateTaskScheduleId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `task-schedule-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `task-schedule-${year}` } },
    { new: true, upsert: true }
  );

  return `TSK-${year}-${String(counter.value).padStart(4, "0")}`;
}
