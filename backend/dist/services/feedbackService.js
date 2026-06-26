"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFeedbackFilter = buildFeedbackFilter;
exports.hasFeedbackForComplaint = hasFeedbackForComplaint;
exports.hasFeedbackForTask = hasFeedbackForTask;
exports.submitComplaintFeedback = submitComplaintFeedback;
exports.submitTaskFeedbackByMongoId = submitTaskFeedbackByMongoId;
exports.buildFeedbackSummary = buildFeedbackSummary;
exports.buildUserFeedbackPerformance = buildUserFeedbackPerformance;
exports.buildFeedbackItems = buildFeedbackItems;
const Feedback_1 = __importDefault(require("../models/Feedback"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Task_1 = __importDefault(require("../models/Task"));
const feedbackId_1 = require("../utils/feedbackId");
const ApiError_1 = require("../utils/ApiError");
function deriveSentiment(rating) {
    return rating >= 4 ? "Positive" : "Negative";
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function getDefaultDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(start), endDate: fmt(end) };
}
function normalizeTeamFilter(team) {
    if (!team || team === "All Teams")
        return undefined;
    return team;
}
function buildFeedbackFilter(query) {
    const filter = {};
    const defaults = getDefaultDateRange();
    const startDate = query.startDate || defaults.startDate;
    const endDate = query.endDate || defaults.endDate;
    filter.createdAt = {
        $gte: startOfDay(new Date(startDate)),
        $lte: endOfDay(new Date(endDate)),
    };
    const team = normalizeTeamFilter(query.team);
    if (team)
        filter.team = team;
    if (query.assignedUserId)
        filter.assignedUserId = query.assignedUserId;
    return filter;
}
async function hasFeedbackForComplaint(complaintId) {
    const existing = await Feedback_1.default.findOne({ complaintId }).select("_id").lean();
    return Boolean(existing);
}
async function hasFeedbackForTask(taskId) {
    const existing = await Feedback_1.default.findOne({ taskId }).select("_id").lean();
    return Boolean(existing);
}
async function createFeedbackRecord(data) {
    return Feedback_1.default.create({
        feedbackId: await (0, feedbackId_1.generateFeedbackId)(),
        complaintId: data.complaintId,
        taskId: data.taskId,
        team: data.team,
        assignedUserId: data.assignedUserId,
        assignedUserName: data.assignedUserName || "",
        customerName: data.customerName,
        sentiment: deriveSentiment(data.rating),
        rating: data.rating,
        comment: data.comment?.trim() || "",
    });
}
async function submitComplaintFeedback(complaintId, payload) {
    if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
        throw new ApiError_1.ApiError(400, "Rating must be between 1 and 5");
    }
    const complaint = await Complaint_1.default.findOne({ complaintId });
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    if (complaint.status !== "Completed") {
        throw new ApiError_1.ApiError(400, "Feedback can only be submitted for completed complaints");
    }
    const existing = await Feedback_1.default.findOne({ complaintId });
    if (existing) {
        throw new ApiError_1.ApiError(409, "Feedback has already been submitted for this complaint");
    }
    const linkedTask = await Task_1.default.findOne({ complaintId }).select("taskId assignedUserId assignedUserName").lean();
    return createFeedbackRecord({
        complaintId,
        taskId: linkedTask?.taskId,
        team: complaint.assignedTeam || "Unassigned",
        assignedUserId: complaint.assignedUserId?.toString() || linkedTask?.assignedUserId?.toString(),
        assignedUserName: complaint.assignedUserName || linkedTask?.assignedUserName || "",
        customerName: complaint.clientName || complaint.contactPerson,
        rating: payload.rating,
        comment: payload.comment,
    });
}
async function submitTaskFeedbackByMongoId(mongoId, payload) {
    if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
        throw new ApiError_1.ApiError(400, "Rating must be between 1 and 5");
    }
    const task = await Task_1.default.findById(mongoId);
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    if (task.status !== "Completed") {
        throw new ApiError_1.ApiError(400, "Feedback can only be submitted for completed tasks");
    }
    if (task.complaintId) {
        return submitComplaintFeedback(task.complaintId, payload);
    }
    const existing = await Feedback_1.default.findOne({ taskId: task.taskId });
    if (existing) {
        throw new ApiError_1.ApiError(409, "Feedback has already been submitted for this task");
    }
    let customerName = task.title;
    return createFeedbackRecord({
        taskId: task.taskId,
        team: task.assignedTeamName || "Unassigned",
        assignedUserId: task.assignedUserId?.toString(),
        assignedUserName: task.assignedUserName || "",
        customerName,
        rating: payload.rating,
        comment: payload.comment,
    });
}
function calcGrowth(current, previous) {
    if (previous === 0) {
        return { growth: current > 0 ? "+100%" : "0%", trend: current > 0 ? "up" : "up" };
    }
    const change = ((current - previous) / previous) * 100;
    const rounded = Math.abs(change).toFixed(1);
    return {
        growth: `${change >= 0 ? "+" : "-"}${rounded}%`,
        trend: change >= 0 ? "up" : "down",
    };
}
function getPreviousPeriod(startDate, endDate) {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
}
async function buildFeedbackSummary(query) {
    const defaults = getDefaultDateRange();
    const startDate = query.startDate || defaults.startDate;
    const endDate = query.endDate || defaults.endDate;
    const filter = buildFeedbackFilter({ ...query, startDate, endDate });
    const prev = getPreviousPeriod(startDate, endDate);
    const prevFilter = buildFeedbackFilter({ ...query, startDate: prev.startDate, endDate: prev.endDate });
    const [positive, negative, total, avgResult, prevTotal] = await Promise.all([
        Feedback_1.default.countDocuments({ ...filter, sentiment: "Positive" }),
        Feedback_1.default.countDocuments({ ...filter, sentiment: "Negative" }),
        Feedback_1.default.countDocuments(filter),
        Feedback_1.default.aggregate([
            { $match: filter },
            { $group: { _id: null, avg: { $avg: "$rating" } } },
        ]),
        Feedback_1.default.countDocuments(prevFilter),
    ]);
    const averageRating = avgResult[0]?.avg ? Number(avgResult[0].avg.toFixed(1)) : 0;
    const totalGrowth = calcGrowth(total, prevTotal);
    return {
        positiveCount: positive,
        negativeCount: negative,
        totalFeedback: total,
        averageRating,
        growth: { totalFeedback: totalGrowth },
    };
}
async function buildUserFeedbackPerformance(query) {
    const filter = buildFeedbackFilter(query);
    const agg = await Feedback_1.default.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$assignedUserName",
                assignedUserId: { $first: "$assignedUserId" },
                team: { $first: "$team" },
                total: { $sum: 1 },
                positive: { $sum: { $cond: [{ $eq: ["$sentiment", "Positive"] }, 1, 0] } },
                negative: { $sum: { $cond: [{ $eq: ["$sentiment", "Negative"] }, 1, 0] } },
                avgRating: { $avg: "$rating" },
            },
        },
        { $sort: { total: -1 } },
    ]);
    return agg.map((row) => ({
        userName: row._id || "Unassigned",
        assignedUserId: row.assignedUserId || "",
        team: row.team || "",
        totalFeedback: row.total,
        positiveCount: row.positive,
        negativeCount: row.negative,
        averageRating: row.avgRating ? Number(row.avgRating.toFixed(1)) : 0,
    }));
}
async function buildFeedbackItems(query, sentiment) {
    const filter = buildFeedbackFilter(query);
    if (sentiment)
        filter.sentiment = sentiment;
    const items = await Feedback_1.default.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    return items.map((item) => ({
        feedbackId: item.feedbackId,
        complaintId: item.complaintId,
        customerName: item.customerName,
        team: item.team,
        assignedUserName: item.assignedUserName || "Unassigned",
        sentiment: item.sentiment,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
    }));
}
