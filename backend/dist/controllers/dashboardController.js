"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
async function getDashboard(_req, res) {
    const [totalComplaints, pending, assigned, inProgress, completed] = await Promise.all([
        Complaint_1.default.countDocuments(),
        Complaint_1.default.countDocuments({ status: "Pending Assignment" }),
        Complaint_1.default.countDocuments({ status: "Assigned" }),
        Complaint_1.default.countDocuments({ status: "In Progress" }),
        Complaint_1.default.countDocuments({ status: "Completed" })
    ]);
    const teamStats = await Promise.all(teamNames.map(async (team) => ({
        team,
        assigned: await Complaint_1.default.countDocuments({ assignedTeam: team }),
        completed: await Complaint_1.default.countDocuments({ assignedTeam: team, status: "Completed" })
    })));
    const statusDistribution = [
        { name: "Pending Assignment", value: pending },
        { name: "Assigned", value: assigned },
        { name: "In Progress", value: inProgress },
        { name: "Completed", value: completed }
    ];
    const monthlyComplaints = await Promise.all(months.map(async (_, index) => {
        const start = new Date(2026, index, 1);
        const end = new Date(2026, index + 1, 1);
        return {
            month: months[index],
            complaints: await Complaint_1.default.countDocuments({ createdAt: { $gte: start, $lt: end } })
        };
    }));
    const recentActivity = await Complaint_1.default.find()
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
