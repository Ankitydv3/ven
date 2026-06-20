import Complaint from "../models/Complaint";

export async function getSharedStats() {
  const [total, completed, inProgress, pending] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: "Completed" }),
    Complaint.countDocuments({ status: "In Progress" }),
    Complaint.countDocuments({ status: "Assigned" })
  ]);

  const overdue = await Complaint.countDocuments({
    status: { $ne: "Completed" },
    deadline: { $lt: new Date() }
  });

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    unresolved: total - completed
  };
}
