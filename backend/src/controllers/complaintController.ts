import TaskSchedule from "../models/TaskSchedule";
import { generateTaskScheduleId } from "../utils/taskScheduleId";
import { syncTaskStatus } from "../services/scheduleService";
import type { Request, Response } from "express";
import Complaint from "../models/Complaint";
import { generateComplaintId } from "../utils/complaintId";
import { ApiError } from "../utils/ApiError";
import type { AuthRequest } from "../middleware/auth";
import { complaintTeamFilter, userTeamName } from "../utils/teamScope";
import * as userService from "../services/userService";

function buildHistoryEntry(action: string, user: { name: string; role: string; team?: string }, extra?: Record<string, string>) {
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

export async function createComplaint(req: Request, res: Response) {
  const payload = req.body as Record<string, string>;
  const complaintId = await generateComplaintId();

  const complaint = await Complaint.create({
    ...payload,
    complaintId,
    status: "Pending Review",
    history: [buildHistoryEntry("Complaint Submitted", { name: payload.contactPerson ?? "Customer", role: "customer" }, { status: "Pending Review", details: payload.title ?? "" })]
  });

  res.status(201).json({
    message: "Complaint Submitted Successfully",
    complaintId: complaint.complaintId,
    complaint
  });
}

export async function listComplaints(req: AuthRequest, res: Response) {
  const { q, status, page = "1", limit = "10", team, scope = "reviewed" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  if (scope === "pending_review") {
    filter.status = "Pending Review";
  } else if (scope === "reviewed") {
    filter.status = { $ne: "Pending Review" };
  }

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

  if (req.user?.role === "team" || req.user?.role === "team_lead") {
    Object.assign(filter, complaintTeamFilter(req.user));
    filter.status = { $in: ["Assigned", "In Progress", "Completed"] };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Complaint.countDocuments(filter)
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

function canAccessComplaint(
  user: { id: string; team?: string; teamName?: string },
  complaint: { assignedUserId?: { toString(): string } | string | null; assignedTeam?: string | null }
) {
  if (complaint.assignedUserId && String(complaint.assignedUserId) === user.id) {
    return true;
  }

  const team = user.team ?? user.teamName;
  return Boolean(team && complaint.assignedTeam === team);
}

export async function assignComplaint(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { assignedUserId, team: legacyTeam, deadline } = req.body as {
    assignedUserId?: string;
    team?: string;
    deadline?: string;
  };

  if (!assignedUserId && !legacyTeam) {
    throw new ApiError(400, "Assignee is required");
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Completed") {
    throw new ApiError(400, "Completed complaints cannot be reassigned");
  }

  if (complaint.status === "Pending Review") {
    throw new ApiError(400, "Complaint must be confirmed from Alerts before assignment");
  }

  if (complaint.status === "Declined") {
    throw new ApiError(400, "Declined complaints cannot be assigned");
  }

  const assignee = assignedUserId
    ? await userService.resolveAssigneeById(assignedUserId)
    : { assignedUserId: undefined, assignedUserName: "", team: legacyTeam! };

  complaint.assignedTeam = assignee.team;
  complaint.assignedUserId = assignee.assignedUserId;
  complaint.assignedUserName = assignee.assignedUserName;
  complaint.assignedBy = req.user?.name ?? "Admin";
  complaint.assignedDate = new Date();
  if (deadline) {
    complaint.deadline = new Date(deadline);
  }
  complaint.status = "Assigned";
  complaint.history.push(
    buildHistoryEntry(
      "Complaint Assigned",
      req.user ?? { name: "Admin", role: "admin", team: assignee.team },
      {
        status: "Assigned",
        details: assignee.assignedUserName
          ? `Assigned to ${assignee.assignedUserName} (${assignee.team})`
          : `Assigned to ${assignee.team}`,
      }
    )
  );

  await complaint.save();

  const existingTask = await TaskSchedule.findOne({
    complaintId: complaint.complaintId,
  });

  if (!existingTask) {
    const taskId = await generateTaskScheduleId();

    await TaskSchedule.create({
      taskId,
      complaintId: complaint.complaintId,
      complaintTitle: complaint.title,
      customerName: complaint.clientName,
      serviceType: complaint.title,
      team: assignee.team,
      assignedUserId: assignee.assignedUserId,
      assignedUserName: assignee.assignedUserName,
      scheduledDate: deadline ? new Date(deadline) : new Date(),
      priority:
        complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
      status: "Pending",
      assignedBy: req.user?.name ?? "Admin",
      remarks: `Auto-created from complaint ${complaint.complaintId}`,
    });
  } else {
    existingTask.team = assignee.team;
    existingTask.assignedUserId = assignee.assignedUserId;
    existingTask.assignedUserName = assignee.assignedUserName;
    existingTask.status = "Pending";
    if (deadline) {
      existingTask.scheduledDate = new Date(deadline);
    }
    await existingTask.save();
  }

  res.json({
    message: "Complaint assigned and task scheduled",
    complaint,
  });
}

export async function startComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Completed") {
    throw new ApiError(400, "Completed complaints are read-only");
  }

  if (!req.user || !canAccessComplaint(req.user, complaint)) {
    throw new ApiError(403, "You can only manage complaints assigned to you");
  }

  const actor = req.user ?? { name: "Team", role: "team" as const, team: complaint.assignedTeam };
  complaint.status = "In Progress";
  complaint.history.push(buildHistoryEntry("Task Started", actor, { status: "In Progress" }));
  await complaint.save();
  await syncTaskStatus(complaint.complaintId, "In Progress");
  res.json({ message: "Work started", complaint });
}

export async function updateComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Completed") {
    throw new ApiError(400, "Completed complaints are read-only");
  }

  if (!req.user || !canAccessComplaint(req.user, complaint)) {
    throw new ApiError(403, "You can only manage complaints assigned to you");
  }

  const { remarks, details } = req.body as { remarks?: string; details?: string };
  const actor = req.user ?? { name: "Team", role: "team" as const, team: complaint.assignedTeam };
  complaint.remarks = remarks ?? complaint.remarks;
  complaint.history.push(buildHistoryEntry("Task Updated", actor, { status: complaint.status, remarks: remarks ?? "", details: details ?? "" }));
  await complaint.save();

  res.json({ message: "Work update saved", complaint });
}

export async function completeComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Completed") {
    throw new ApiError(400, "Completed complaints are read-only");
  }

  if (!req.user || !canAccessComplaint(req.user, complaint)) {
    throw new ApiError(403, "You can only manage complaints assigned to you");
  }

  const { completionRemarks, resolutionDetails } = req.body as { completionRemarks?: string; resolutionDetails?: string };
  const actor = req.user ?? { name: "Team", role: "team" as const, team: complaint.assignedTeam };
  complaint.status = "Completed";
  complaint.completedBy = req.user?.name ?? "Team";
  complaint.completedDate = new Date();
  complaint.resolutionDetails = resolutionDetails ?? "";
  complaint.remarks = completionRemarks ?? complaint.remarks;
  complaint.history.push(buildHistoryEntry("Task Completed", actor, { status: "Completed", remarks: completionRemarks ?? "", details: resolutionDetails ?? "" }));
  await complaint.save();
  await syncTaskStatus(complaint.complaintId, "Completed");

  res.json({ message: "Complaint completed", complaint });
}

export async function trackComplaint(req: Request, res: Response) {
  const complaint = await Complaint.findOne({ complaintId: req.params.complaintId });
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  res.json({ complaint });
}

export async function confirmComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status !== "Pending Review") {
    throw new ApiError(400, "Only pending review complaints can be confirmed");
  }

  complaint.status = "Pending Assignment";
  complaint.history.push(
    buildHistoryEntry("Complaint Confirmed", req.user ?? { name: "Admin", role: "admin" }, {
      status: "Pending Assignment",
      details: `Confirmed and moved to complaint management`,
    })
  );
  await complaint.save();

  res.json({ message: "Complaint confirmed", complaint });
}

export async function declineComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status !== "Pending Review") {
    throw new ApiError(400, "Only pending review complaints can be declined");
  }

  const { reason } = req.body as { reason?: string };
  complaint.status = "Declined";
  complaint.history.push(
    buildHistoryEntry("Complaint Declined", req.user ?? { name: "Admin", role: "admin" }, {
      status: "Declined",
      remarks: reason ?? "",
      details: reason ? `Declined: ${reason}` : "Complaint declined by admin",
    })
  );
  await complaint.save();

  res.json({ message: "Complaint declined", complaint });
}