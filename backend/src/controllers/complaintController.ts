import type { Request, Response } from "express";
import Complaint from "../models/Complaint";
import { generateComplaintId } from "../utils/complaintId";
import { ApiError } from "../utils/ApiError";
import type { AuthRequest } from "../middleware/auth";

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
    status: "Pending Assignment",
    history: [buildHistoryEntry("Complaint Submitted", { name: payload.contactPerson ?? "Customer", role: "customer" }, { status: "Pending Assignment", details: payload.title ?? "" })]
  });

  res.status(201).json({
    message: "Complaint Submitted Successfully",
    complaintId: complaint.complaintId,
    complaint
  });
}

export async function listComplaints(req: AuthRequest, res: Response) {
  const { q, status, page = "1", limit = "10", team } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

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
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Complaint.countDocuments(filter)
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

export async function assignComplaint(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { team } = req.body as { team?: string };

  if (!team) {
    throw new ApiError(400, "Team is required");
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  complaint.assignedTeam = team;
  complaint.assignedBy = req.user?.name ?? "Admin";
  complaint.assignedDate = new Date();
  complaint.status = "Assigned";
  complaint.history.push(buildHistoryEntry("Complaint Assigned", req.user ?? { name: "Admin", role: "admin" }, { status: "Assigned", details: `Assigned to ${team}` }));

  await complaint.save();
  res.json({ message: "Complaint assigned", complaint });
}

export async function startComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (req.user?.team !== complaint.assignedTeam) {
    throw new ApiError(403, "You can only manage complaints assigned to your team");
  }

  const actor = req.user ?? { name: "Team", role: "team" as const, team: complaint.assignedTeam };
  complaint.status = "In Progress";
  complaint.history.push(buildHistoryEntry("Task Started", actor, { status: "In Progress" }));
  await complaint.save();
  res.json({ message: "Work started", complaint });
}

export async function updateComplaint(req: AuthRequest, res: Response) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (req.user?.team !== complaint.assignedTeam) {
    throw new ApiError(403, "You can only manage complaints assigned to your team");
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

  if (req.user?.team !== complaint.assignedTeam) {
    throw new ApiError(403, "You can only manage complaints assigned to your team");
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

  res.json({ message: "Complaint completed", complaint });
}

export async function trackComplaint(req: Request, res: Response) {
  const complaint = await Complaint.findOne({ complaintId: req.params.complaintId });
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  res.json({ complaint });
}