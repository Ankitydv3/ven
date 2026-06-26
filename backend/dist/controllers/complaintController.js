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
const Task_1 = __importDefault(require("../models/Task"));
const Order_1 = __importDefault(require("../models/Order"));
const taskService_1 = require("../services/taskService");
const feedbackService_1 = require("../services/feedbackService");
const materialRequestService_1 = require("../services/materialRequestService");
const workflowService_1 = require("../services/workflowService");
const Complaint_1 = __importDefault(require("../models/Complaint"));
const complaintId_1 = require("../utils/complaintId");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const userService = __importStar(require("../services/userService"));
const teamService_1 = require("../services/teamService");
const orderService_1 = require("../services/orderService");
const OPEN_COMPLAINT_STATUSES = ["Pending Review", "Pending Assignment", "Assigned", "In Progress"];
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
    const availability = [availableDate && `Date: ${availableDate}`, availableTime && `Time: ${availableTime}`]
        .filter(Boolean)
        .join(", ");
    const descriptionParts = [
        complaintType === "Other" ? complaintDescription : null,
        address,
        availability,
        `Order: ${orderId}`,
    ].filter(Boolean);
    const description = descriptionParts.join(" | ") || "No description provided";
    const title = complaintType;
    const source = payload.source === "WEBSITE" ? "WEBSITE" : "MANUAL";
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
        complaintId,
        source,
        status: source === "WEBSITE"
            ? "Pending Review"
            : "Pending Assignment",
        history: [
            buildHistoryEntry("Complaint Submitted", { name: clientName, role: "customer" }, {
                status: source === "WEBSITE"
                    ? "Pending Review"
                    : "Pending Assignment",
                details: title,
            }),
        ],
    });
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
        const taskScope = (0, teamScope_1.taskVisibilityFilter)(req.user);
        let taskComplaintIds = [];
        if (Object.keys(taskScope).length > 0) {
            taskComplaintIds = await Task_1.default.find({
                ...taskScope,
                complaintId: { $exists: true, $ne: "" },
            }).distinct("complaintId");
        }
        const accessOr = [];
        if (Array.isArray(teamFilter.$or)) {
            accessOr.push(...teamFilter.$or);
        }
        else if (Object.keys(teamFilter).length > 0) {
            accessOr.push(teamFilter);
        }
        if (taskComplaintIds.length > 0) {
            accessOr.push({ complaintId: { $in: taskComplaintIds } });
        }
        const teamAccess = accessOr.length > 0 ? { $or: accessOr } : { assignedTeam: "__none__" };
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
                : { status: { $in: ["Assigned", "In Progress", "Completed"] } };
        const andClauses = [statusFilter, teamAccess];
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
    const [linkedTasks, materialByComplaint] = await Promise.all([
        complaintIds.length
            ? Task_1.default.find({ complaintId: { $in: complaintIds } })
                .select("complaintId taskId status dueDate dueDateKey")
                .lean()
            : Promise.resolve([]),
        (0, materialRequestService_1.getActiveMaterialRequestsByComplaintIds)(complaintIds),
    ]);
    const taskByComplaintId = new Map(linkedTasks.map((task) => [task.complaintId, task]));
    const enrichedItems = items.map((item) => {
        const task = taskByComplaintId.get(item.complaintId);
        const materialRequest = materialByComplaint.get(item.complaintId);
        const workflowStage = (0, workflowService_1.resolveWorkflowStage)({
            complaintStatus: item.status,
            taskStatus: task?.status ?? null,
            materialRequestStatus: materialRequest?.status ?? null,
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
    if (complaint.assignedUserId && String(complaint.assignedUserId) === user.id) {
        return true;
    }
    const team = user.team ?? user.teamName;
    return Boolean(team && complaint.assignedTeam === team);
}
async function assignComplaint(req, res) {
    const { id } = req.params;
    const { assignedUserId, team: legacyTeam, deadline } = req.body;
    if (!assignedUserId && !legacyTeam) {
        throw new ApiError_1.ApiError(400, "Assignee is required");
    }
    const complaint = await Complaint_1.default.findById(id);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status === "Completed") {
        throw new ApiError_1.ApiError(400, "Completed complaints cannot be reassigned");
    }
    if (complaint.status === "Pending Review") {
        throw new ApiError_1.ApiError(400, "Complaint must be confirmed from Alerts before assignment");
    }
    if (complaint.status === "Declined") {
        throw new ApiError_1.ApiError(400, "Declined complaints cannot be assigned");
    }
    if (complaint.status === "In Progress") {
        throw new ApiError_1.ApiError(400, "Cannot reassign a complaint that is in progress");
    }
    const assignee = assignedUserId
        ? await userService.resolveAssigneeById(assignedUserId)
        : { assignedUserId: undefined, assignedUserName: "", team: legacyTeam };
    complaint.assignedTeam = assignee.team;
    complaint.assignedUserId = assignee.assignedUserId;
    complaint.assignedUserName = assignee.assignedUserName;
    complaint.assignedBy = req.user?.name ?? "Admin";
    complaint.assignedDate = new Date();
    if (deadline) {
        complaint.deadline = new Date(deadline);
    }
    complaint.status = "Assigned";
    complaint.history.push(buildHistoryEntry("Complaint Assigned", req.user ?? { name: "Admin", role: "admin", team: assignee.team }, {
        status: "Assigned",
        details: assignee.assignedUserName
            ? `Assigned to ${assignee.assignedUserName} (${assignee.team})`
            : `Assigned to ${assignee.team}`,
    }));
    await complaint.save();
    const existingTask = await Task_1.default.findOne({
        complaintId: complaint.complaintId,
    });
    if (existingTask) {
        await (0, taskService_1.assertComplaintEligibleForTaskAssignment)(complaint.complaintId);
    }
    if (!existingTask) {
        await (0, taskService_1.createTask)({
            complaintId: complaint.complaintId,
            title: complaint.title,
            description: complaint.description ?? "",
            priority: complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
            assignedUserId: String(assignee.assignedUserId),
            dueDate: deadline ? new Date(deadline) : new Date(),
            remarks: `Auto-created from complaint ${complaint.complaintId}`,
            createdBy: req.user?.name ?? "Admin",
        });
    }
    else {
        await (0, taskService_1.updateTaskById)(String(existingTask._id), {
            assignedUserId: String(assignee.assignedUserId),
            dueDate: deadline ? new Date(deadline) : existingTask.dueDate,
            status: "Pending",
        }, {
            id: req.user?.id ?? "",
            name: req.user?.name ?? "Admin",
            role: req.user?.role ?? "admin",
        });
    }
    res.json({
        message: "Complaint assigned and task scheduled",
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
    const complaint = await Complaint_1.default.findById(id);
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
    const wasCompleted = complaint.status === "Completed";
    const previousTeam = complaint.assignedTeam;
    complaint.assignedTeam = teamDoc.teamName;
    complaint.assignedUserId = undefined;
    complaint.assignedUserName = "";
    complaint.assignedBy = req.user?.name ?? "Admin";
    complaint.assignedDate = new Date();
    if (!wasCompleted && complaint.status !== "In Progress") {
        complaint.status = "Assigned";
    }
    complaint.history.push(buildHistoryEntry(isReassign ? "Team Reassigned" : "Complaint Assigned", req.user ?? { name: "Admin", role: "admin", team: teamDoc.teamName }, {
        status: complaint.status,
        details: isReassign
            ? `Reassigned from ${previousTeam ?? "unassigned"} to ${teamDoc.teamName}`
            : `Assigned to ${teamDoc.teamName}`,
    }));
    await complaint.save();
    const existingTask = await Task_1.default.findOne({ complaintId: complaint.complaintId });
    if (existingTask) {
        existingTask.assignedTeamName = teamDoc.teamName;
        existingTask.assignedTeamId = teamDoc._id;
        if (wasCompleted || isReassign) {
            existingTask.assignedUserId = undefined;
            existingTask.assignedUserName = "";
        }
        await existingTask.save();
    }
    res.json({
        message: isReassign ? "Team reassigned successfully" : "Team assigned successfully",
        complaint,
    });
}
async function startComplaint(req, res) {
    const complaint = await Complaint_1.default.findById(req.params.id);
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
    const complaint = await Complaint_1.default.findById(req.params.id);
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
    const complaint = await Complaint_1.default.findById(req.params.id);
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
    complaint.history.push(buildHistoryEntry("Task Completed", actor, { status: "Completed", remarks: completionRemarks ?? "", details: resolutionDetails ?? "" }));
    await complaint.save();
    await (0, taskService_1.syncComplaintTaskStatus)(complaint.complaintId, "Completed");
    res.json({ message: "Complaint completed", complaint });
}
async function trackComplaint(req, res) {
    const complaint = await Complaint_1.default.findOne({ complaintId: req.params.complaintId });
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    const hasFeedback = await (0, feedbackService_1.hasFeedbackForComplaint)(complaint.complaintId);
    res.json({ complaint, hasFeedback });
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
    const complaint = await Complaint_1.default.findById(req.params.id);
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
    const complaint = await Complaint_1.default.findById(req.params.id);
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
