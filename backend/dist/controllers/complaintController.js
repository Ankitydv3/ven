"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupOrdersForComplaint = lookupOrdersForComplaint;
exports.createComplaint = createComplaint;
exports.getComplaintStats = getComplaintStats;
exports.listComplaints = listComplaints;
exports.assignComplaint = assignComplaint;
exports.assignComplaintTeam = assignComplaintTeam;
exports.startComplaint = startComplaint;
exports.updateComplaint = updateComplaint;
exports.completeComplaint = completeComplaint;
exports.trackComplaint = trackComplaint;
exports.submitFeedback = submitFeedback;
exports.confirmComplaint = confirmComplaint;
exports.declineComplaint = declineComplaint;
exports.scheduleRevisit = scheduleRevisit;
exports.getClientHistory = getClientHistory;
exports.getClientHistoryComplaintDetail = getClientHistoryComplaintDetail;
const Task_1 = __importDefault(require("../models/Task"));
const Order_1 = __importDefault(require("../models/Order"));
const taskService_1 = require("../services/taskService");
const feedbackService_1 = require("../services/feedbackService");
const materialRequestService_1 = require("../services/materialRequestService");
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const Payment_1 = __importDefault(require("../models/Payment"));
const workflowService_1 = require("../services/workflowService");
const Complaint_1 = __importDefault(require("../models/Complaint"));
const complaintId_1 = require("../utils/complaintId");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const userService = __importStar(require("../services/userService"));
const teamService_1 = require("../services/teamService");
const orderService_1 = require("../services/orderService");
const complaintAssignmentService_1 = require("../services/complaintAssignmentService");
const OPEN_COMPLAINT_STATUSES = [
    "Pending Review",
    "Pending Assignment",
    "Assigned",
    "In Progress",
    "Site Visit",
    "Material Required",
    "Material Granted",
    "Revisit"
];
function normalizePhoneDigits(phone) {
    return phone.replace(/\D/g, "").slice(-10);
}
function buildDelayFilter() {
    return {
        $or: [
            { title: /delay|delayed|late|overdue/i },
            { description: /delay|delayed|late|overdue/i },
            { deadline: { $lt: new Date() } },
        ],
    };
}
function buildMaterialFilter() {
    return {
        $or: [
            { description: /material|parts|inventory|unavail/i },
            { title: /material|parts|inventory/i },
            { remarks: /material|parts|inventory/i },
        ],
    };
}
function applyDateRangeFilter(filter, startDate, endDate) {
    if (!startDate && !endDate)
        return;
    const createdAt = {};
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        createdAt.$gte = start;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
    }
    filter.createdAt = createdAt;
}
function applyDisplayStatusFilter(filter, displayStatus) {
    if (!displayStatus || displayStatus === "All")
        return;
    if (displayStatus === "Completed" || displayStatus === "Resolved") {
        filter.status = "Completed";
        return;
    }
    if (displayStatus === "Pending") {
        filter.status = { $in: ["Pending Assignment", "Assigned", "In Progress"] };
        return;
    }
    if (displayStatus === "Unresolved") {
        filter.status = { $in: ["Pending Review", "Pending Assignment", "Assigned", "In Progress"] };
        return;
    }
    if (displayStatus === "Assigned") {
        filter.status = "Assigned";
        return;
    }
    if (displayStatus === "In Progress") {
        filter.status = "In Progress";
        return;
    }
    if (displayStatus === "Delayed") {
        filter.status = { $in: OPEN_COMPLAINT_STATUSES };
        Object.assign(filter, buildDelayFilter());
    }
}
async function applyWorkflowDisplayStatusFilter(filter, displayStatus) {
    const stage = (0, workflowService_1.workflowStageFilter)(displayStatus);
    if (!stage)
        return false;
    const complaints = await Complaint_1.default.find({ status: { $ne: "Declined" } })
        .select("complaintId status")
        .lean();
    const complaintIds = complaints.map((c) => c.complaintId);
    const [tasks, materialMap] = await Promise.all([
        Task_1.default.find({ complaintId: { $in: complaintIds } }).select("complaintId status").lean(),
        (0, materialRequestService_1.getActiveMaterialRequestsByComplaintIds)(complaintIds),
    ]);
    const taskByComplaint = new Map(tasks.map((t) => [t.complaintId, t]));
    const matchingIds = complaints
        .filter((c) => {
        const task = taskByComplaint.get(c.complaintId);
        const material = materialMap.get(c.complaintId);
        const workflowStage = (0, workflowService_1.resolveWorkflowStage)({
            complaintStatus: c.status,
            taskStatus: task?.status ?? null,
            materialRequestStatus: material?.status ?? null,
        });
        return workflowStage === stage;
    })
        .map((c) => c.complaintId);
    filter.complaintId = { $in: matchingIds.length > 0 ? matchingIds : ["__none__"] };
    return true;
}
async function applyTaskDisplayStatusFilter(filter, displayStatus) {
    const taskStatus = displayStatus === "Re-visit"
        ? "Need Re-visit"
        : displayStatus === "Material Required"
            ? "Need Material"
            : null;
    if (!taskStatus)
        return false;
    const complaintIds = await Task_1.default.find({
        status: taskStatus,
        complaintId: { $exists: true, $ne: "" },
    }).distinct("complaintId");
    filter.complaintId = { $in: complaintIds.length > 0 ? complaintIds : ["__none__"] };
    return true;
}
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
async function lookupOrdersForComplaint(req, res) {
    const phone = String(req.query.phone ?? "").trim();
    const orderId = String(req.query.orderId ?? "").trim();
    let orders = [];
    if (orderId) {
        orders = await (0, orderService_1.lookupOrdersByOrderId)(orderId);
    }
    else if (phone) {
        orders = await (0, orderService_1.lookupOrdersByPhone)(phone);
    }
    res.json({
        phone: phone ? normalizePhoneDigits(phone) : "",
        orderId,
        found: orders.length > 0,
        items: orders,
    });
}
async function createComplaint(req, res) {
    const payload = req.body;
    const files = req.files;
    const complaintId = await (0, complaintId_1.generateComplaintId)();
    const clientName = payload.clientName?.trim() || payload.name?.trim();
    const orderId = payload.orderId?.trim() || "";
    const address = payload.address?.trim() || payload.location?.trim() || "";
    const email = payload.email?.trim() || "";
    const mobileNumber = payload.mobileNumber?.trim() || "";
    const availableDate = payload.availableDate?.trim() || "";
    const availableTime = payload.availableTime?.trim() || "";
    const complaintType = payload.complaintType?.trim() || payload.title?.trim() || "";
    const complaintDescription = payload.complaintDescription?.trim() || "";
    if (!clientName)
        throw new ApiError_1.ApiError(400, "Name is required");
    if (!orderId)
        throw new ApiError_1.ApiError(400, "Order ID is required");
    const order = await Order_1.default.findOne({ orderId });
    if (!order) {
        throw new ApiError_1.ApiError(400, "Order not found. Please select a valid order from your phone lookup.");
    }
    const orderPhone = normalizePhoneDigits(order.phone);
    const complaintPhone = normalizePhoneDigits(mobileNumber);
    if (orderPhone !== complaintPhone) {
        throw new ApiError_1.ApiError(400, "Mobile number does not match the selected order record.");
    }
    if (!mobileNumber)
        throw new ApiError_1.ApiError(400, "Mobile number is required");
    if (!address)
        throw new ApiError_1.ApiError(400, "Address is required");
    if (!complaintType)
        throw new ApiError_1.ApiError(400, "Complaint type is required");
    if (complaintType === "Other" && complaintDescription.length < 10) {
        throw new ApiError_1.ApiError(400, "Please provide a description for other complaint types");
    }
    const pictureUrl = files?.picture?.[0] ? `/uploads/complaints/${files.picture[0].filename}` : "";
    const quotationUrl = files?.quotation?.[0] ? `/uploads/complaints/${files.quotation[0].filename}` : "";
    const availabilityNotes = payload.availability?.trim() || "";
    const timeSlot = payload.timeSlot?.trim() || "";
    const locationCoordinates = payload.locationCoordinates?.trim() || "";
    const assignedTeam = payload.assignedTeam?.trim() || "";
    const availabilityStr = [
        availableDate && `Date: ${availableDate}`,
        timeSlot && `Slot: ${timeSlot}`,
        availableTime && `Time: ${availableTime}`,
        availabilityNotes && `Notes: ${availabilityNotes}`
    ]
        .filter(Boolean)
        .join(", ");
    const descriptionParts = [
        complaintType === "Other" ? complaintDescription : null,
        address,
        locationCoordinates && `Coords: ${locationCoordinates}`,
        availabilityStr,
        `Order: ${orderId}`,
    ].filter(Boolean);
    const description = descriptionParts.join(" | ") || "No description provided";
    const title = complaintType;
    const source = payload.source === "WEBSITE" ? "WEBSITE" : "MANUAL";
    let status = source === "WEBSITE" ? "Pending Review" : "Pending Assignment";
    if (assignedTeam) {
        status = "Assigned";
    }
    const complaint = await Complaint_1.default.create({
        clientName,
        contactPerson: payload.contactPerson?.trim() || "",
        mobileNumber,
        email,
        orderId,
        title,
        description,
        priority: payload.priority?.trim() || "Medium",
        location: address,
        pictureUrl,
        quotationUrl,
        availableDate,
        availableTime,
        availability: availabilityNotes,
        timeSlot,
        locationCoordinates,
        assignedTeam: assignedTeam || undefined,
        assignedBy: assignedTeam ? (payload.createdBy || "Admin") : "",
        createdBy: source === "WEBSITE" ? clientName : (payload.createdBy || "Admin"),
        assignedDate: assignedTeam ? new Date() : undefined,
        complaintId,
        source,
        status,
        history: [
            buildHistoryEntry("Complaint Submitted", { name: clientName, role: "customer" }, {
                status,
                details: assignedTeam ? `Submitted and assigned to ${assignedTeam}` : title,
            }),
        ],
    });
    if (assignedTeam) {
        await (0, taskService_1.createComplaintAssignmentTask)({
            complaintId: complaint.complaintId,
            title: complaint.title,
            description: complaint.description ?? "",
            priority: complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
            assignedTeamName: assignedTeam,
            dueDate: availableDate ? new Date(availableDate) : new Date(),
            remarks: `Auto-created from complaint ${complaint.complaintId}`,
            createdBy: payload.createdBy || "Admin",
        });
    }
    res.status(201).json({
        message: "Complaint Submitted Successfully",
        complaintId: complaint.complaintId,
        complaint,
    });
}
async function getComplaintStats(req, res) {
    const { startDate, endDate, team } = req.query;
    const filter = { status: { $ne: "Declined" } };
    if (team && team !== "All Teams") {
        filter.assignedTeam = team;
    }
    applyDateRangeFilter(filter, startDate, endDate);
    if (req.user && (0, teamScope_1.isTeamRole)(req.user.role)) {
        const teamFilter = (0, teamScope_1.complaintTeamFilter)(req.user);
        if (Object.keys(teamFilter).length > 0) {
            Object.assign(filter, teamFilter);
        }
    }
    const [total, resolved, unresolved, issuePending] = await Promise.all([
        Complaint_1.default.countDocuments(filter),
        Complaint_1.default.countDocuments({ ...filter, status: "Completed" }),
        Complaint_1.default.countDocuments({
            ...filter,
            status: { $in: OPEN_COMPLAINT_STATUSES },
        }),
        Complaint_1.default.countDocuments({
            ...filter,
            status: { $in: OPEN_COMPLAINT_STATUSES },
            $or: [buildDelayFilter(), buildMaterialFilter()],
        }),
    ]);
    res.json({ total, resolved, unresolved, issuePending });
}
async function listComplaints(req, res) {
    const { q, status, displayStatus, page = "1", limit = "10", team, scope = "reviewed", startDate, endDate, } = req.query;
    const filter = {};
    const isActiveAssignedScope = scope === "active_assigned" || scope === "my_tasks";
    const activeStatusFilter = (0, complaintAssignmentService_1.activeComplaintStatusFilter)();
    if (displayStatus && displayStatus !== "All") {
        const appliedWorkflowFilter = await applyWorkflowDisplayStatusFilter(filter, displayStatus);
        if (!appliedWorkflowFilter) {
            const appliedTaskFilter = await applyTaskDisplayStatusFilter(filter, displayStatus);
            if (!appliedTaskFilter) {
                applyDisplayStatusFilter(filter, displayStatus);
            }
        }
    }
    else {
        if (scope === "pending_review") {
            filter.status = "Pending Review";
        }
        else if (isActiveAssignedScope) {
            Object.assign(filter, activeStatusFilter);
        }
        else if (scope === "reviewed") {
            filter.status = { $ne: "Pending Review" };
        }
        if (status && status !== "All") {
            filter.status = status;
        }
    }
    if (team && team !== "All Teams") {
        filter.assignedTeam = team;
    }
    applyDateRangeFilter(filter, startDate, endDate);
    if (q) {
        filter.$or = [
            { complaintId: { $regex: q, $options: "i" } },
            { clientName: { $regex: q, $options: "i" } },
            { mobileNumber: { $regex: q, $options: "i" } }
        ];
    }
    if (req.user && (0, teamScope_1.isTeamRole)(req.user.role)) {
        const teamFilter = (0, teamScope_1.complaintTeamFilter)(req.user);
        const statusFilter = displayStatus && displayStatus !== "All"
            ? await (async () => {
                const clause = {};
                const appliedWorkflowFilter = await applyWorkflowDisplayStatusFilter(clause, displayStatus);
                if (!appliedWorkflowFilter) {
                    const appliedTaskFilter = await applyTaskDisplayStatusFilter(clause, displayStatus);
                    if (!appliedTaskFilter) {
                        applyDisplayStatusFilter(clause, displayStatus);
                    }
                }
                return clause;
            })()
            : status && status !== "All"
                ? { status }
                : isActiveAssignedScope
                    ? activeStatusFilter
                    : activeStatusFilter;
        const andClauses = [
            statusFilter,
            Object.keys(teamFilter).length > 0 ? teamFilter : { assignedTeam: "__none__" },
        ];
        if (q) {
            andClauses.push({
                $or: [
                    { complaintId: { $regex: q, $options: "i" } },
                    { clientName: { $regex: q, $options: "i" } },
                    { mobileNumber: { $regex: q, $options: "i" } },
                ],
            });
        }
        if (team && team !== "All Teams") {
            andClauses.push({ assignedTeam: team });
        }
        if (startDate || endDate) {
            const dateClause = {};
            applyDateRangeFilter(dateClause, startDate, endDate);
            andClauses.push(dateClause);
        }
        const preservedKeys = ["createdAt", "assignedTeam"];
        for (const key of preservedKeys) {
            if (filter[key] !== undefined && !andClauses.some((clause) => key in clause)) {
                andClauses.push({ [key]: filter[key] });
            }
        }
        for (const key of Object.keys(filter)) {
            delete filter[key];
        }
        filter.$and = andClauses;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
        Complaint_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Complaint_1.default.countDocuments(filter)
    ]);
    const complaintIds = items.map((item) => item.complaintId);
    const [taskByComplaintId, materialByComplaint] = await Promise.all([
        (0, complaintAssignmentService_1.getActiveTasksByComplaintIds)(complaintIds),
        (0, materialRequestService_1.getActiveMaterialRequestsByComplaintIds)(complaintIds),
    ]);
    const enrichedItems = items.map((item) => {
        const task = taskByComplaintId.get(item.complaintId);
        const materialRequest = materialByComplaint.get(item.complaintId);
        const workflowStage = (0, workflowService_1.resolveWorkflowStage)({
            complaintStatus: item.status,
            taskStatus: task?.status ?? null,
            materialRequestStatus: materialRequest?.status ?? null,
            siteVisitStatus: item.siteVisitStatus ?? null,
        });
        return {
            ...item.toObject(),
            taskScheduleStatus: task?.status ?? null,
            taskScheduleDueDate: task?.dueDateKey ?? task?.dueDate ?? null,
            taskId: task?.taskId ?? null,
            materialRequestStatus: materialRequest?.status ?? null,
            materialRequestId: materialRequest?.requestId ?? null,
            workflowStage,
        };
    });
    res.json({ items: enrichedItems, total, page: Number(page), limit: Number(limit) });
}
function canAccessComplaint(user, complaint) {
    if (user.role && (user.role === "super_admin" || user.role === "admin" || user.role === "sub_admin")) {
        return true;
    }
    const team = user.team ?? user.teamName;
    return Boolean(team && complaint.assignedTeam === team);
}
async function findComplaintByIdOrCid(id) {
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        const byId = await Complaint_1.default.findById(id);
        if (byId)
            return byId;
    }
    return await Complaint_1.default.findOne({ complaintId: id });
}
async function assignComplaint(req, res) {
    const { id } = req.params;
    const { assignedUserId, team: legacyTeam, deadline } = req.body;
    if (!assignedUserId && !legacyTeam) {
        throw new ApiError_1.ApiError(400, "Assignee is required");
    }
    const complaint = await findComplaintByIdOrCid(id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Pending Review") {
        throw new ApiError_1.ApiError(400, "Complaint must be confirmed from Alerts before assignment");
    }
    if (complaint.status === "Declined") {
        throw new ApiError_1.ApiError(400, "Declined complaints cannot be assigned");
    }
    const wasTerminal = (0, complaintAssignmentService_1.isTerminalComplaintStatus)(complaint.status);
    const isReassign = Boolean(complaint.assignedUserId || complaint.assignedTeam);
    const assignee = assignedUserId
        ? await userService.resolveAssigneeById(assignedUserId)
        : { assignedUserId: undefined, assignedUserName: "", team: legacyTeam };
    if (wasTerminal || isReassign) {
        (0, complaintAssignmentService_1.closeActiveComplaintAssignments)(complaint, wasTerminal && complaint.status === "Completed" ? "completed" : "reassigned");
    }
    complaint.assignedTeam = assignee.team;
    complaint.assignedUserId = assignee.assignedUserId;
    complaint.assignedUserName = assignee.assignedUserName;
    complaint.assignedBy = req.user?.name ?? "Admin";
    complaint.assignedDate = new Date();
    if (deadline) {
        complaint.deadline = new Date(deadline);
    }
    if (wasTerminal || !isReassign || complaint.status !== "In Progress") {
        (0, complaintAssignmentService_1.resetComplaintForNewAssignment)(complaint);
    }
    else {
        complaint.status = "Assigned";
    }
    const task = await (0, taskService_1.createComplaintAssignmentTask)({
        complaintId: complaint.complaintId,
        title: complaint.title,
        description: complaint.description ?? "",
        priority: complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
        assignedUserId: assignee.assignedUserId ? String(assignee.assignedUserId) : undefined,
        assignedTeamName: assignee.team,
        dueDate: deadline ? new Date(deadline) : new Date(),
        remarks: `Auto-created from complaint ${complaint.complaintId}`,
        createdBy: req.user?.name ?? "Admin",
    });
    (0, complaintAssignmentService_1.recordComplaintAssignment)(complaint, {
        assignedTeam: assignee.team,
        assignedUserId: assignee.assignedUserId,
        assignedUserName: assignee.assignedUserName,
        assignedBy: req.user?.name ?? "Admin",
        taskId: task.taskId,
    });
    complaint.history.push(buildHistoryEntry(isReassign || wasTerminal ? "Complaint Reassigned" : "Complaint Assigned", req.user ?? { name: "Admin", role: "admin", team: assignee.team }, {
        status: complaint.status,
        details: assignee.assignedUserName
            ? `${isReassign || wasTerminal ? "Reassigned" : "Assigned"} to ${assignee.assignedUserName} (${assignee.team})`
            : `${isReassign || wasTerminal ? "Reassigned" : "Assigned"} to ${assignee.team}`,
    }));
    await complaint.save();
    res.json({
        message: isReassign || wasTerminal ? "Complaint reassigned and task scheduled" : "Complaint assigned and task scheduled",
        complaint,
    });
}
async function assignComplaintTeam(req, res) {
    const { id } = req.params;
    const { team } = req.body;
    if (!team?.trim()) {
        throw new ApiError_1.ApiError(400, "Team is required");
    }
    const teamDoc = await (0, teamService_1.resolveTeamByName)(team);
    if (!teamDoc) {
        throw new ApiError_1.ApiError(400, "Selected team does not exist. Create the team first.");
    }
    const complaint = await findComplaintByIdOrCid(id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Pending Review") {
        throw new ApiError_1.ApiError(400, "Complaint must be confirmed from Alerts before assignment");
    }
    if (complaint.status === "Declined") {
        throw new ApiError_1.ApiError(400, "Declined complaints cannot be assigned");
    }
    const isReassign = Boolean(complaint.assignedTeam);
    const wasTerminal = (0, complaintAssignmentService_1.isTerminalComplaintStatus)(complaint.status);
    const previousTeam = complaint.assignedTeam;
    if (wasTerminal || isReassign) {
        (0, complaintAssignmentService_1.closeActiveComplaintAssignments)(complaint, wasTerminal && complaint.status === "Completed" ? "completed" : "reassigned");
    }
    complaint.assignedTeam = teamDoc.teamName;
    complaint.assignedUserId = undefined;
    complaint.assignedUserName = "";
    complaint.assignedBy = req.user?.name ?? "Admin";
    complaint.assignedDate = new Date();
    if (wasTerminal || complaint.status !== "In Progress") {
        (0, complaintAssignmentService_1.resetComplaintForNewAssignment)(complaint);
    }
    else {
        complaint.status = "Assigned";
    }
    const task = await (0, taskService_1.createComplaintAssignmentTask)({
        complaintId: complaint.complaintId,
        title: complaint.title,
        description: complaint.description ?? "",
        priority: complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
        assignedTeamName: teamDoc.teamName,
        dueDate: new Date(),
        remarks: `Auto-created from complaint ${complaint.complaintId}`,
        createdBy: req.user?.name ?? "Admin",
    });
    (0, complaintAssignmentService_1.recordComplaintAssignment)(complaint, {
        assignedTeam: teamDoc.teamName,
        assignedUserName: "",
        assignedBy: req.user?.name ?? "Admin",
        taskId: task.taskId,
    });
    complaint.history.push(buildHistoryEntry(isReassign || wasTerminal ? "Team Reassigned" : "Complaint Assigned", req.user ?? { name: "Admin", role: "admin", team: teamDoc.teamName }, {
        status: complaint.status,
        details: isReassign || wasTerminal
            ? `Reassigned from ${previousTeam ?? "unassigned"} to ${teamDoc.teamName}`
            : `Assigned to ${teamDoc.teamName}`,
    }));
    await complaint.save();
    res.json({
        message: isReassign || wasTerminal ? "Team reassigned successfully" : "Team assigned successfully",
        complaint,
    });
}
async function startComplaint(req, res) {
    const complaint = await findComplaintByIdOrCid(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Completed") {
        throw new ApiError_1.ApiError(400, "Completed complaints are read-only");
    }
    if (!req.user || !canAccessComplaint(req.user, complaint)) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to you");
    }
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.status = "In Progress";
    complaint.history.push(buildHistoryEntry("Task Started", actor, { status: "In Progress" }));
    await complaint.save();
    await (0, taskService_1.syncComplaintTaskStatus)(complaint.complaintId, "In Progress");
    res.json({ message: "Work started", complaint });
}
async function updateComplaint(req, res) {
    const complaint = await findComplaintByIdOrCid(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Completed") {
        throw new ApiError_1.ApiError(400, "Completed complaints are read-only");
    }
    if (!req.user || !canAccessComplaint(req.user, complaint)) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to you");
    }
    const { remarks, details } = req.body;
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.remarks = remarks ?? complaint.remarks;
    complaint.history.push(buildHistoryEntry("Task Updated", actor, { status: complaint.status, remarks: remarks ?? "", details: details ?? "" }));
    await complaint.save();
    res.json({ message: "Work update saved", complaint });
}
async function completeComplaint(req, res) {
    const complaint = await findComplaintByIdOrCid(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Completed") {
        throw new ApiError_1.ApiError(400, "Completed complaints are read-only");
    }
    if (!req.user || !canAccessComplaint(req.user, complaint)) {
        throw new ApiError_1.ApiError(403, "You can only manage complaints assigned to you");
    }
    const { completionRemarks, resolutionDetails } = req.body;
    const actor = req.user ?? { name: "Team", role: "team", team: complaint.assignedTeam };
    complaint.status = "Completed";
    complaint.completedBy = req.user?.name ?? "Team";
    complaint.completedDate = new Date();
    complaint.resolutionDetails = resolutionDetails ?? "";
    complaint.remarks = completionRemarks ?? complaint.remarks;
    (0, complaintAssignmentService_1.closeActiveComplaintAssignments)(complaint, "completed");
    complaint.history.push(buildHistoryEntry("Task Completed", actor, { status: "Completed", remarks: completionRemarks ?? "", details: resolutionDetails ?? "" }));
    await complaint.save();
    await (0, taskService_1.syncComplaintTaskStatus)(complaint.complaintId, "Completed");
    res.json({ message: "Complaint completed", complaint });
}
async function trackComplaint(req, res) {
    const complaint = await Complaint_1.default.findOne({ complaintId: req.params.complaintId }).lean();
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    const [hasFeedback, task] = await Promise.all([
        (0, feedbackService_1.hasFeedbackForComplaint)(complaint.complaintId),
        Task_1.default.findOne((0, complaintAssignmentService_1.activeTaskQuery)(complaint.complaintId)).sort({ createdAt: -1 }).lean()
    ]);
    res.json({
        complaint: {
            ...complaint,
            taskHistory: task?.history ?? []
        },
        hasFeedback
    });
}
async function submitFeedback(req, res) {
    const complaintId = String(req.params.complaintId);
    const { rating, comment } = req.body;
    const feedback = await (0, feedbackService_1.submitComplaintFeedback)(complaintId, {
        rating: Number(rating),
        comment,
    });
    res.status(201).json({
        message: "Thank you for your feedback",
        feedback,
    });
}
async function confirmComplaint(req, res) {
    const complaint = await findComplaintByIdOrCid(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status !== "Pending Review") {
        throw new ApiError_1.ApiError(400, "Only pending review complaints can be confirmed");
    }
    complaint.status = "Pending Assignment";
    complaint.history.push(buildHistoryEntry("Complaint Confirmed", req.user ?? { name: "Admin", role: "admin" }, {
        status: "Pending Assignment",
        details: `Confirmed and moved to complaint management`,
    }));
    await complaint.save();
    res.json({ message: "Complaint confirmed", complaint });
}
async function declineComplaint(req, res) {
    const complaint = await findComplaintByIdOrCid(req.params.id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status !== "Pending Review") {
        throw new ApiError_1.ApiError(400, "Only pending review complaints can be declined");
    }
    const { reason } = req.body;
    complaint.status = "Declined";
    complaint.history.push(buildHistoryEntry("Complaint Declined", req.user ?? { name: "Admin", role: "admin" }, {
        status: "Declined",
        remarks: reason ?? "",
        details: reason ? `Declined: ${reason}` : "Complaint declined by admin",
    }));
    await complaint.save();
    res.json({ message: "Complaint declined", complaint });
}
async function scheduleRevisit(req, res) {
    const { id } = req.params;
    const { date, timeSlot, team, remarks } = req.body;
    const complaint = await findComplaintByIdOrCid(id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    const actor = req.user || { name: "Admin", role: "admin" };
    const previousTeam = complaint.assignedTeam;
    const teamChanged = Boolean(previousTeam && previousTeam !== team);
    if (complaint.assignedTeam || complaint.assignedUserId) {
        (0, complaintAssignmentService_1.closeActiveComplaintAssignments)(complaint, "reassigned");
    }
    complaint.status = "Assigned";
    complaint.siteVisitStatus = "Revisit";
    complaint.availableDate = date;
    complaint.timeSlot = timeSlot;
    complaint.assignedTeam = team;
    if (teamChanged) {
        complaint.assignedUserId = undefined;
        complaint.assignedUserName = "";
    }
    if (remarks)
        complaint.remarks = remarks;
    complaint.history.push(buildHistoryEntry("Revisit Scheduled", actor, {
        status: "Assigned",
        remarks: remarks || "",
        details: `Revisit scheduled for ${date} at ${timeSlot} with team ${team}`,
    }));
    const task = await (0, taskService_1.createComplaintAssignmentTask)({
        complaintId: complaint.complaintId,
        title: complaint.title,
        description: complaint.description,
        priority: complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
        assignedUserId: complaint.assignedUserId ? String(complaint.assignedUserId) : undefined,
        assignedTeamName: team,
        dueDate: new Date(date),
        remarks: remarks || `Revisit for ${complaint.complaintId}`,
        createdBy: actor.name,
    });
    (0, complaintAssignmentService_1.recordComplaintAssignment)(complaint, {
        assignedTeam: team,
        assignedUserId: complaint.assignedUserId ?? undefined,
        assignedUserName: complaint.assignedUserName ?? "",
        assignedBy: actor.name,
        taskId: task.taskId,
    });
    await complaint.save();
    res.json({ message: "Revisit scheduled successfully", complaint });
}
function buildClientHistoryFilter(q) {
    const phoneDigits = normalizePhoneDigits(q);
    const orFilters = [
        { complaintId: { $regex: q, $options: "i" } },
        { orderId: { $regex: q, $options: "i" } },
        { clientName: { $regex: q, $options: "i" } },
    ];
    if (phoneDigits.length >= 10) {
        orFilters.push({ mobileNumber: { $regex: phoneDigits } });
    }
    return { $or: orFilters };
}
async function getClientHistory(req, res) {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? "1") || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? "12") || 12));
    if (!q) {
        throw new ApiError_1.ApiError(400, "Search by phone number, complaint ID, or order ID");
    }
    const filter = buildClientHistoryFilter(q);
    const skip = (page - 1) * limit;
    const [total, complaints, primary, distinctIds] = await Promise.all([
        Complaint_1.default.countDocuments(filter),
        Complaint_1.default.find(filter)
            .select("_id complaintId clientName mobileNumber email orderId createdAt title description priority location assignedTeam assignedUserName status siteVisitStatus")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Complaint_1.default.findOne(filter).sort({ createdAt: -1 }).lean(),
        Complaint_1.default.distinct("complaintId", filter),
    ]);
    if (!total || !primary) {
        throw new ApiError_1.ApiError(404, "No client record found for this search");
    }
    const complaintIds = complaints.map((c) => c.complaintId);
    const [linkedTasks, materialByComplaint, taskCount, materialCount, paymentCount] = await Promise.all([
        complaintIds.length
            ? Task_1.default.find({ complaintId: { $in: complaintIds } })
                .select("complaintId taskId status dueDate dueDateKey")
                .lean()
            : Promise.resolve([]),
        (0, materialRequestService_1.getActiveMaterialRequestsByComplaintIds)(complaintIds),
        Task_1.default.countDocuments({ complaintId: { $in: distinctIds } }),
        MaterialRequest_1.default.countDocuments({ complaintId: { $in: distinctIds } }),
        Payment_1.default.countDocuments({ complaintId: { $in: distinctIds } }),
    ]);
    const taskByComplaintId = new Map(linkedTasks.map((task) => [task.complaintId, task]));
    const summaries = complaints.map((item) => {
        const task = taskByComplaintId.get(item.complaintId);
        const materialRequest = materialByComplaint.get(item.complaintId);
        const workflowStage = (0, workflowService_1.resolveWorkflowStage)({
            complaintStatus: item.status,
            taskStatus: task?.status ?? null,
            materialRequestStatus: materialRequest?.status ?? null,
            siteVisitStatus: item.siteVisitStatus ?? null,
        });
        return {
            _id: String(item._id),
            complaintId: item.complaintId,
            clientName: item.clientName,
            createdAt: item.createdAt,
            complaintType: item.title && item.title !== item.complaintId ? item.title : "General",
            status: item.status,
            workflowStage,
            assignedTeam: item.assignedTeam ?? "",
            assignedUserName: item.assignedUserName ?? "",
            priority: item.priority,
            location: item.location,
        };
    });
    res.json({
        client: {
            name: primary.clientName,
            phone: primary.mobileNumber,
            email: primary.email ?? "",
            orderId: primary.orderId ?? "",
        },
        summary: {
            totalComplaints: total,
            totalTasks: taskCount,
            totalMaterialRequests: materialCount,
            totalPayments: paymentCount,
        },
        complaints: summaries,
        total,
        page,
        limit,
    });
}
async function getClientHistoryComplaintDetail(req, res) {
    const complaintId = String(req.params.complaintId ?? "").trim();
    if (!complaintId) {
        throw new ApiError_1.ApiError(400, "Complaint ID is required");
    }
    const complaint = await Complaint_1.default.findOne({ complaintId }).lean();
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    const [tasks, materialRequests, payments, order, hasFeedback] = await Promise.all([
        Task_1.default.find({ complaintId }).sort({ createdAt: -1 }).lean(),
        MaterialRequest_1.default.find({ complaintId }).sort({ createdAt: -1 }).lean(),
        Payment_1.default.find({ complaintId }).sort({ createdAt: -1 }).lean(),
        complaint.orderId ? Order_1.default.findOne({ orderId: complaint.orderId }).lean() : null,
        (0, feedbackService_1.hasFeedbackForComplaint)(complaintId),
    ]);
    const primaryTask = tasks.find((task) => task.isActive !== false) ?? tasks[0];
    const materialRequest = materialRequests[0];
    const workflowStage = (0, workflowService_1.resolveWorkflowStage)({
        complaintStatus: complaint.status,
        taskStatus: primaryTask?.status ?? null,
        materialRequestStatus: materialRequest?.status ?? null,
        siteVisitStatus: complaint.siteVisitStatus ?? null,
    });
    res.json({
        complaint: {
            ...complaint,
            workflowStage,
            taskHistory: primaryTask?.history ?? [],
            taskScheduleStatus: primaryTask?.status ?? null,
            taskScheduleDueDate: primaryTask?.dueDateKey ?? primaryTask?.dueDate ?? null,
            taskId: primaryTask?.taskId ?? null,
        },
        tasks,
        materialRequests,
        payments,
        order,
        hasFeedback,
    });
}
