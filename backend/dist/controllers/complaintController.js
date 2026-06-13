"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComplaint = createComplaint;
exports.listComplaints = listComplaints;
exports.assignComplaint = assignComplaint;
exports.startComplaint = startComplaint;
exports.updateComplaint = updateComplaint;
exports.completeComplaint = completeComplaint;
exports.trackComplaint = trackComplaint;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const complaintId_1 = require("../utils/complaintId");
const ApiError_1 = require("../utils/ApiError");
function buildHistoryEntry(action, user, extra) {
    return {
        action,
        by: user.name,
        role: user.role,
        team: user.team,
        remarks: extra?.remarks ?? "",
        details: extra?.details ?? "",
        status: extra?.status ?? "Pending Assignment",
        createdAt: new Date()
    };
}
async function createComplaint(req, res) {
    const payload = req.body;
    const complaintId = await (0, complaintId_1.generateComplaintId)();
    const complaint = await Complaint_1.default.create({
        ...payload,
        complaintId,
        status: "Pending Assignment",
        history: [buildHistoryEntry("Complaint Submitted", { name: payload.contactPerson ?? "Customer", role: "customer" }, { status: "Pending Assignment", details: payload.title ?? "" })]
    });
    res.status(201).json({
        message: "Complaint Submitted Successfully",
        complaintId: complaint.complaintId,
        complaint
    });
}
async function listComplaints(req, res) {
    const { q, status, page = "1", limit = "10", team } = req.query;
    const filter = {};
    if (status && status !== "All") {
        filter.status = status;
    }
    if (team) {
        filter.assignedTeam = team;
    }
    if (q) {
        filter.$or = [
            { complaintId: { $regex: q, $options: "i" } },
            { clientName: { $regex: q, $options: "i" } },
            { mobileNumber: { $regex: q, $options: "i" } }
        ];
    }
    if (req.user?.role === "team" && req.user.team) {
        filter.assignedTeam = req.user.team;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
        Complaint_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Complaint_1.default.countDocuments(filter)
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
}
async function assignComplaint(req, res) {
    const { id } = req.params;
    const { team } = req.body;
    if (!team) {
        throw new ApiError_1.ApiError(400, "Team is required");
    }
    const complaint = await Complaint_1.default.findById(id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    complaint.assignedTeam = team;
    complaint.assignedBy = req.user?.name ?? "Admin";
    complaint.assignedDate = new Date();
    complaint.status = "Assigned";
    complaint.history.push(buildHistoryEntry("Complaint Assigned", req.user ?? { name: "Admin", role: "admin" }, { status: "Assigned", details: `Assigned to ${team}` }));
    await complaint.save();
    res.json({ message: "Complaint assigned", complaint });
}
async function startComplaint(req, res) {
    const complaint = await Complaint_1.default.findById(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (req.user?.team !== complaint.assignedTeam) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to your team");
    }
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.status = "In Progress";
    complaint.history.push(buildHistoryEntry("Task Started", actor, { status: "In Progress" }));
    await complaint.save();
    res.json({ message: "Work started", complaint });
}
async function updateComplaint(req, res) {
    const complaint = await Complaint_1.default.findById(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (req.user?.team !== complaint.assignedTeam) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to your team");
    }
    const { remarks, details } = req.body;
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.remarks = remarks ?? complaint.remarks;
    complaint.history.push(buildHistoryEntry("Task Updated", actor, { status: complaint.status, remarks: remarks ?? "", details: details ?? "" }));
    await complaint.save();
    res.json({ message: "Work update saved", complaint });
}
async function completeComplaint(req, res) {
    const complaint = await Complaint_1.default.findById(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (req.user?.team !== complaint.assignedTeam) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to your team");
    }
    const { completionRemarks, resolutionDetails } = req.body;
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.status = "Completed";
    complaint.completedBy = req.user?.name ?? "Team";
    complaint.completedDate = new Date();
    complaint.resolutionDetails = resolutionDetails ?? "";
    complaint.remarks = completionRemarks ?? complaint.remarks;
    complaint.history.push(buildHistoryEntry("Task Completed", actor, { status: "Completed", remarks: completionRemarks ?? "", details: resolutionDetails ?? "" }));
    await complaint.save();
    res.json({ message: "Complaint completed", complaint });
}
async function trackComplaint(req, res) {
    const complaint = await Complaint_1.default.findOne({ complaintId: req.params.complaintId });
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    res.json({ complaint });
}
