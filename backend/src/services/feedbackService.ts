import Feedback from "../models/Feedback";
import Complaint from "../models/Complaint";
import Task from "../models/Task";
import { generateFeedbackId } from "../utils/feedbackId";
import { ApiError } from "../utils/ApiError";
import type { ReportsQuery } from "./reportsService";

export interface SubmitFeedbackPayload {
  rating: number;
  comment?: string;
}

function deriveSentiment(rating: number): "Positive" | "Negative" {
  return rating >= 4 ? "Positive" : "Negative";
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

function normalizeTeamFilter(team?: string) {
  if (!team || team === "All Teams") return undefined;
  return team;
}

export function buildFeedbackFilter(query: ReportsQuery) {
  const filter: Record<string, unknown> = {};
  const defaults = getDefaultDateRange();
  const startDate = query.startDate || defaults.startDate;
  const endDate = query.endDate || defaults.endDate;

  filter.createdAt = {
    $gte: startOfDay(new Date(startDate)),
    $lte: endOfDay(new Date(endDate)),
  };

  const team = normalizeTeamFilter(query.team);
  if (team) filter.team = team;
  if (query.assignedUserId) filter.assignedUserId = query.assignedUserId;

  return filter;
}

export async function hasFeedbackForComplaint(complaintId: string) {
  const existing = await Feedback.findOne({ complaintId }).select("_id").lean();
  return Boolean(existing);
}

export async function hasFeedbackForTask(taskId: string) {
  const existing = await Feedback.findOne({ taskId }).select("_id").lean();
  return Boolean(existing);
}

async function createFeedbackRecord(data: {
  complaintId?: string;
  taskId?: string;
  team: string;
  assignedUserId?: string;
  assignedUserName?: string;
  customerName: string;
  rating: number;
  comment?: string;
}) {
  return Feedback.create({
    feedbackId: await generateFeedbackId(),
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

export async function submitComplaintFeedback(complaintId: string, payload: SubmitFeedbackPayload) {
  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const complaint = await Complaint.findOne({ complaintId });
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status !== "Completed") {
    throw new ApiError(400, "Feedback can only be submitted for completed complaints");
  }

  const existing = await Feedback.findOne({ complaintId });
  if (existing) {
    throw new ApiError(409, "Feedback has already been submitted for this complaint");
  }

  const linkedTask = await Task.findOne({ complaintId }).select("taskId assignedUserId assignedUserName").lean();

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

export async function submitTaskFeedbackByMongoId(mongoId: string, payload: SubmitFeedbackPayload) {
  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const task = await Task.findById(mongoId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (task.status !== "Completed") {
    throw new ApiError(400, "Feedback can only be submitted for completed tasks");
  }

  if (task.complaintId) {
    return submitComplaintFeedback(task.complaintId, payload);
  }

  const existing = await Feedback.findOne({ taskId: task.taskId });
  if (existing) {
    throw new ApiError(409, "Feedback has already been submitted for this task");
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

function calcGrowth(current: number, previous: number) {
  if (previous === 0) {
    return { growth: current > 0 ? "+100%" : "0%", trend: current > 0 ? ("up" as const) : ("up" as const) };
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.abs(change).toFixed(1);
  return {
    growth: `${change >= 0 ? "+" : "-"}${rounded}%`,
    trend: change >= 0 ? ("up" as const) : ("down" as const),
  };
}

function getPreviousPeriod(startDate: string, endDate: string) {
  const start = startOfDay(new Date(startDate));
  const end = endOfDay(new Date(endDate));
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
}

export async function buildFeedbackSummary(query: ReportsQuery) {
  const defaults = getDefaultDateRange();
  const startDate = query.startDate || defaults.startDate;
  const endDate = query.endDate || defaults.endDate;
  const filter = buildFeedbackFilter({ ...query, startDate, endDate });

  const prev = getPreviousPeriod(startDate, endDate);
  const prevFilter = buildFeedbackFilter({ ...query, startDate: prev.startDate, endDate: prev.endDate });

  const [positive, negative, total, avgResult, prevTotal] = await Promise.all([
    Feedback.countDocuments({ ...filter, sentiment: "Positive" }),
    Feedback.countDocuments({ ...filter, sentiment: "Negative" }),
    Feedback.countDocuments(filter),
    Feedback.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]),
    Feedback.countDocuments(prevFilter),
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

export async function buildUserFeedbackPerformance(query: ReportsQuery) {
  const filter = buildFeedbackFilter(query);

  const agg = await Feedback.aggregate([
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

export async function buildFeedbackItems(query: ReportsQuery, sentiment?: "Positive" | "Negative") {
  const filter = buildFeedbackFilter(query);
  if (sentiment) filter.sentiment = sentiment;

  const items = await Feedback.find(filter)
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
