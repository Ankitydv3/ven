"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedStats = getSharedStats;
const Complaint_1 = __importDefault(require("../models/Complaint"));
async function getSharedStats(team) {
    const now = new Date();
    const teamFilter = team ? { assignedTeam: team } : {};
    const [total, completed, inProgressAll, assignedAll, pendingAssignment] = await Promise.all([
        Complaint_1.default.countDocuments(teamFilter),
        Complaint_1.default.countDocuments({ ...teamFilter, status: "Completed" }),
        Complaint_1.default.countDocuments({ ...teamFilter, status: "In Progress" }),
        Complaint_1.default.countDocuments({ ...teamFilter, status: "Assigned" }),
        Complaint_1.default.countDocuments({ ...teamFilter, status: "Pending Assignment" })
    ]);
    // Overdue: Any uncompleted complaint where deadline is past
    const overdue = await Complaint_1.default.countDocuments({
        ...teamFilter,
        status: { $in: ["Assigned", "In Progress"] },
        deadline: { $lt: now }
    });
    // To ensure they don't overlap in the count if we want them to sum to Unresolved:
    // We can define 'Pending' and 'In Progress' for stats as 'not overdue'
    const inProgress = await Complaint_1.default.countDocuments({
        ...teamFilter,
        status: "In Progress",
        $or: [{ deadline: { $exists: false } }, { deadline: { $gte: now } }]
    });
    const pending = await Complaint_1.default.countDocuments({
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
