import Complaint from "../models/Complaint";

export async function getSharedStats(team?: string) {
  const now = new Date();
  const teamFilter = team ? { assignedTeam: team } : {};

  const [total, completed, inProgressAll, assignedAll, pendingAssignment] = await Promise.all([
    Complaint.countDocuments(teamFilter),
    Complaint.countDocuments({ ...teamFilter, status: "Completed" }),
    Complaint.countDocuments({ ...teamFilter, status: "In Progress" }),
    Complaint.countDocuments({ ...teamFilter, status: "Assigned" }),
    Complaint.countDocuments({ ...teamFilter, status: "Pending Assignment" })
  ]);

  // Overdue: Any uncompleted complaint where deadline is past
  const overdue = await Complaint.countDocuments({
    ...teamFilter,
    status: { $in: ["Assigned", "In Progress"] },
    deadline: { $lt: now }
  });

  // To ensure they don't overlap in the count if we want them to sum to Unresolved:
  // We can define 'Pending' and 'In Progress' for stats as 'not overdue'
  const inProgress = await Complaint.countDocuments({
    ...teamFilter,
    status: "In Progress",
    $or: [{ deadline: { $exists: false } }, { deadline: { $gte: now } }]
  });

  const pending = await Complaint.countDocuments({
    ...teamFilter,
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
