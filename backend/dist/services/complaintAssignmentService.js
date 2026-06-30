"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINAL_COMPLAINT_STATUSES = void 0;
exports.activeComplaintStatusFilter = activeComplaintStatusFilter;
exports.isTerminalComplaintStatus = isTerminalComplaintStatus;
exports.supersedeComplaintTasks = supersedeComplaintTasks;
exports.activeTaskQuery = activeTaskQuery;
exports.closeActiveComplaintAssignments = closeActiveComplaintAssignments;
exports.resetComplaintForNewAssignment = resetComplaintForNewAssignment;
exports.recordComplaintAssignment = recordComplaintAssignment;
exports.getActiveTaskForComplaint = getActiveTaskForComplaint;
exports.getActiveTasksByComplaintIds = getActiveTasksByComplaintIds;
const Task_1 = __importDefault(require("../models/Task"));
exports.TERMINAL_COMPLAINT_STATUSES = [
    "Completed",
    "Cancelled",
    "Declined",
    "Pending Review",
];
function activeComplaintStatusFilter() {
    return {
        status: { $nin: [...exports.TERMINAL_COMPLAINT_STATUSES] },
    };
}
function isTerminalComplaintStatus(status) {
    return exports.TERMINAL_COMPLAINT_STATUSES.includes(status);
}
async function supersedeComplaintTasks(complaintId) {
    await Task_1.default.updateMany({
        complaintId,
        ...activeTaskQuery(),
    }, { $set: { isActive: false } });
}
function activeTaskQuery(complaintId) {
    const base = {
        $or: [
            { isActive: true },
            { isActive: { $exists: false }, status: { $nin: ["Completed", "Cancelled"] } },
        ],
    };
    if (complaintId) {
        base.complaintId = complaintId;
    }
    return base;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function closeActiveComplaintAssignments(complaint, endReason) {
    const now = new Date();
    for (const assignment of complaint.assignments) {
        if (assignment.status === "active") {
            assignment.status = endReason === "completed" ? "completed" : "superseded";
            assignment.endedAt = now;
            assignment.endReason = endReason;
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resetComplaintForNewAssignment(complaint) {
    complaint.status = "Assigned";
    complaint.completedBy = "";
    complaint.completedDate = undefined;
    complaint.resolutionDetails = "";
    complaint.completionPictureUrl = "";
    complaint.siteVisitStatus = "Pending";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recordComplaintAssignment(complaint, input) {
    complaint.assignments.push({
        assignedTeam: input.assignedTeam,
        assignedUserId: input.assignedUserId,
        assignedUserName: input.assignedUserName,
        assignedBy: input.assignedBy,
        assignedAt: new Date(),
        taskId: input.taskId,
        status: "active",
    });
}
async function getActiveTaskForComplaint(complaintId) {
    return Task_1.default.findOne(activeTaskQuery(complaintId))
        .sort({ createdAt: -1 })
        .lean();
}
async function getActiveTasksByComplaintIds(complaintIds) {
    if (!complaintIds.length)
        return new Map();
    const tasks = await Task_1.default.find({
        complaintId: { $in: complaintIds },
        $or: [
            { isActive: true },
            { isActive: { $exists: false }, status: { $nin: ["Completed", "Cancelled"] } },
        ],
    })
        .select("complaintId taskId status dueDate dueDateKey assignedUserId assignedUserName assignedTeamName")
        .sort({ createdAt: -1 })
        .lean()
        .maxTimeMS(10_000);
    const map = new Map();
    for (const task of tasks) {
        if (!task.complaintId)
            continue;
        if (!map.has(task.complaintId)) {
            map.set(task.complaintId, task);
        }
    }
    return map;
}
