import type { Response } from "express";
import Complaint from "../models/Complaint";

const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export async function getDashboard(_req: unknown, res: Response) {
  const [totalComplaints, pending, assigned, inProgress, completed] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: "Pending Assignment" }),
    Complaint.countDocuments({ status: "Assigned" }),
    Complaint.countDocuments({ status: "In Progress" }),
    Complaint.countDocuments({ status: "Completed" })
  ]);

  const teamStats = await Promise.all(
    teamNames.map(async (team) => ({
      team,
      assigned: await Complaint.countDocuments({ assignedTeam: team }),
      completed: await Complaint.countDocuments({ assignedTeam: team, status: "Completed" })
    }))
  );

  const statusDistribution = [
    { name: "Pending Assignment", value: pending },
    { name: "Assigned", value: assigned },
    { name: "In Progress", value: inProgress },
    { name: "Completed", value: completed }
  ];

  const monthlyComplaints = await Promise.all(
    months.map(async (_, index) => {
      const start = new Date(2026, index, 1);
      const end = new Date(2026, index + 1, 1);
      return {
        month: months[index],
        complaints: await Complaint.countDocuments({ createdAt: { $gte: start, $lt: end } })
      };
    })
  );

  const recentActivity = await Complaint.find()
    .sort({ updatedAt: -1 })
    .limit(8)
    .select("complaintId status assignedTeam updatedAt history")
    .lean();

  res.json({
    totalComplaints,
    pending,
    assigned,
    inProgress,
    completed,
    teamStats,
    statusDistribution,
    monthlyComplaints,
    recentActivity
  });
}