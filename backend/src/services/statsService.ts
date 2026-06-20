import Complaint from "../models/Complaint";

export async function getSharedStats() {
  const now = new Date();

  const [total, completed, inProgressAll, assignedAll, pendingAssignment] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: "Completed" }),
    Complaint.countDocuments({ status: "In Progress" }),
    Complaint.countDocuments({ status: "Assigned" }),
    Complaint.countDocuments({ status: "Pending Assignment" })
  ]);

  // Overdue: Any uncompleted complaint where deadline is past
  const overdue = await Complaint.countDocuments({
    status: { $in: ["Assigned", "In Progress"] },
    deadline: { $lt: now }
  });

  // To ensure they don't overlap in the count if we want them to sum to Unresolved:
  // We can define 'Pending' and 'In Progress' for stats as 'not overdue'
  const inProgress = await Complaint.countDocuments({
    status: "In Progress",
    $or: [{ deadline: { $exists: false } }, { deadline: { $gte: now } }]
  });

  const pending = await Complaint.countDocuments({
    status: "Assigned",
    $or: [{ deadline: { $exists: false } }, { deadline: { $gte: now } }]
  });

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    pendingAssignment,
    unresolved: total - completed
  };
}
