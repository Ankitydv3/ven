import Complaint from "../models/Complaint";
import {
  ensureCounterAtLeast,
  nextCounterValue,
  parseSequenceSuffix,
} from "./counterUtils";

async function getMaxComplaintSequence(year: number) {
  const complaints = await Complaint.find({ complaintId: { $regex: `^CMP-${year}-` } })
    .select("complaintId")
    .lean();

  let max = 0;
  const pattern = new RegExp(`^CMP-${year}-(\\d+)$`);
  for (const complaint of complaints) {
    max = Math.max(max, parseSequenceSuffix(complaint.complaintId, pattern));
  }
  return max;
}

export async function generateComplaintId() {
  const year = new Date().getFullYear();
  const key = `complaint-${year}`;

  await ensureCounterAtLeast(key, await getMaxComplaintSequence(year));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sequence = await nextCounterValue(key);
    const complaintId = `CMP-${year}-${String(sequence).padStart(3, "0")}`;
    const exists = await Complaint.exists({ complaintId });
    if (!exists) {
      return complaintId;
    }
    await ensureCounterAtLeast(key, sequence);
  }

  throw new Error("Unable to generate a unique complaint ID");
}
