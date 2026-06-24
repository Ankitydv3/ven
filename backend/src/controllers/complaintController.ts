import Task from "../models/Task";
import { createTask, syncComplaintTaskStatus, updateTaskById, assertComplaintEligibleForTaskAssignment } from "../services/taskService";
import { hasFeedbackForComplaint, submitComplaintFeedback } from "../services/feedbackService";
import type { Request, Response } from "express";
import Complaint from "../models/Complaint";
import { generateComplaintId } from "../utils/complaintId";
import { ApiError } from "../utils/ApiError";
import type { AuthRequest } from "../middleware/auth";
import { complaintTeamFilter, isTeamRole, taskVisibilityFilter } from "../utils/teamScope";
import * as userService from "../services/userService";
import { resolveTeamByName } from "../services/teamService";

const OPEN_COMPLAINT_STATUSES = ["Pending Review", "Pending Assignment", "Assigned", "In Progress"] as const;

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

function applyDateRangeFilter(filter: Record<string, unknown>, startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return;
  const createdAt: Record<string, Date> = {};
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

function applyDisplayStatusFilter(filter: Record<string, unknown>, displayStatus?: string) {
  if (!displayStatus || displayStatus === "All") return;

  if (displayStatus === "Completed" || displayStatus === "Resolved") {
    filter.status = "Completed";
    return;
  }

  if (displayStatus === "Pending") {
    filter.status = "Pending Assignment";
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

async function applyTaskDisplayStatusFilter(filter: Record<string, unknown>, displayStatus: string) {
  const taskStatus =
    displayStatus === "Re-visit"
      ? "Need Re-visit"
      : displayStatus === "Material Required"
        ? "Need Material"
        : null;

  if (!taskStatus) return false;

  const complaintIds = await Task.find({
    status: taskStatus,
    complaintId: { $exists: true, $ne: "" },
  }).distinct("complaintId");

  filter.complaintId = { $in: complaintIds.length > 0 ? complaintIds : ["__none__"] };
  return true;
}

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
  const files = req.files as { picture?: Express.Multer.File[]; quotation?: Express.Multer.File[] } | undefined;
  const complaintId = await generateComplaintId();

  const clientName = payload.clientName?.trim() || payload.name?.trim();
  const orderId = payload.orderId?.trim() || "";
  const address = payload.address?.trim() || payload.location?.trim() || "";
  const salesPerson = payload.salesPerson?.trim() || "";
  const email = payload.email?.trim() || "";
  const mobileNumber = payload.mobileNumber?.trim() || "";
  const availableDate = payload.availableDate?.trim() || "";
  const availableTime = payload.availableTime?.trim() || "";
  const complaintType = payload.complaintType?.trim() || payload.title?.trim() || "";
  const complaintDescription = payload.complaintDescription?.trim() || "";

  if (!clientName) throw new ApiError(400, "Name is required");
  if (!orderId) throw new ApiError(400, "Order ID is required");
  if (!mobileNumber) throw new ApiError(400, "Mobile number is required");
  if (!address) throw new ApiError(400, "Address is required");
  if (!complaintType) throw new ApiError(400, "Complaint type is required");
  if (complaintType === "Other" && complaintDescription.length < 10) {
    throw new ApiError(400, "Please provide a description for other complaint types");
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
    salesPerson && `Sales person: ${salesPerson}`,
    `Order: ${orderId}`,
  ].filter(Boolean);
  const description = descriptionParts.join(" | ") || "No description provided";
  const title = complaintType;

  const complaint = await Complaint.create({
    clientName,
    contactPerson: salesPerson,
    mobileNumber,
    email,
    orderId,
    salesPerson,
    title,
    description,
    priority: payload.priority?.trim() || "Medium",
    location: address,
    pictureUrl,
    quotationUrl,
    availableDate,
    availableTime,
    complaintId,
    status: "Pending Review",
    history: [
      buildHistoryEntry(
        "Complaint Submitted",
        { name: clientName, role: "customer" },
        { status: "Pending Review", details: title }
      ),
    ],
  });

  res.status(201).json({
    message: "Complaint Submitted Successfully",
    complaintId: complaint.complaintId,
    complaint,
  });
}

export async function getComplaintStats(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { status: { $ne: "Declined" } };

  if (team && team !== "All Teams") {
    filter.assignedTeam = team;
  }

  applyDateRangeFilter(filter, startDate, endDate);

  if (req.user && isTeamRole(req.user.role)) {
    const teamFilter = complaintTeamFilter(req.user);
    if (Object.keys(teamFilter).length > 0) {
      Object.assign(filter, teamFilter);
    }
  }

  const [total, resolved, unresolved, issuePending] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: "Completed" }),
    Complaint.countDocuments({
      ...filter,
      status: { $in: OPEN_COMPLAINT_STATUSES },
    }),
    Complaint.countDocuments({
      ...filter,
      status: { $in: OPEN_COMPLAINT_STATUSES },
      $or: [buildDelayFilter(), buildMaterialFilter()],
    }),
  ]);

  res.json({ total, resolved, unresolved, issuePending });
}

export async function listComplaints(req: AuthRequest, res: Response) {
  const {
    q,
    status,
    displayStatus,
    page = "1",
    limit = "10",
    team,
    scope = "reviewed",
    startDate,
    endDate,
  } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  if (displayStatus && displayStatus !== "All") {
    const appliedTaskFilter = await applyTaskDisplayStatusFilter(filter, displayStatus);
    if (!appliedTaskFilter) {
      applyDisplayStatusFilter(filter, displayStatus);
    }
  } else {
    if (scope === "pending_review") {
      filter.status = "Pending Review";
    } else if (scope === "reviewed") {
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

  if (req.user && isTeamRole(req.user.role)) {
    const teamFilter = complaintTeamFilter(req.user);
    const taskScope = taskVisibilityFilter(req.user);
    let taskComplaintIds: string[] = [];

    if (Object.keys(taskScope).length > 0) {
      taskComplaintIds = await Task.find({
        ...taskScope,
        complaintId: { $exists: true, $ne: "" },
      }).distinct("complaintId");
    }

    const accessOr: Record<string, unknown>[] = [];
    if (Array.isArray(teamFilter.$or)) {
      accessOr.push(...(teamFilter.$or as Record<string, unknown>[]));
    } else if (Object.keys(teamFilter).length > 0) {
      accessOr.push(teamFilter);
    }
    if (taskComplaintIds.length > 0) {
      accessOr.push({ complaintId: { $in: taskComplaintIds } });
    }

    const teamAccess =
      accessOr.length > 0 ? { $or: accessOr } : { assignedTeam: "__none__" };

    const statusFilter =
      displayStatus && displayStatus !== "All"
        ? await (async () => {
            const clause: Record<string, unknown> = {};
            const appliedTaskFilter = await applyTaskDisplayStatusFilter(clause, displayStatus);
            if (!appliedTaskFilter) {
              applyDisplayStatusFilter(clause, displayStatus);
            }
            return clause;
          })()
        : status && status !== "All"
          ? { status }
          : { status: { $in: ["Assigned", "In Progress", "Completed"] } };

    const andClauses: Record<string, unknown>[] = [statusFilter, teamAccess];

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
      const dateClause: Record<string, unknown> = {};
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
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Complaint.countDocuments(filter)
  ]);

  const complaintIds = items.map((item) => item.complaintId);
  const linkedTasks = complaintIds.length
    ? await Task.find({ complaintId: { $in: complaintIds } })
        .select("complaintId taskId status dueDate dueDateKey")
        .lean()
    : [];
  const taskByComplaintId = new Map(linkedTasks.map((task) => [task.complaintId, task]));

  const enrichedItems = items.map((item) => {
    const task = taskByComplaintId.get(item.complaintId);
    return {
      ...item.toObject(),
      taskScheduleStatus: task?.status ?? null,
      taskScheduleDueDate: task?.dueDateKey ?? task?.dueDate ?? null,
      taskId: task?.taskId ?? null,
    };
  });

  res.json({ items: enrichedItems, total, page: Number(page), limit: Number(limit) });
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

  if (complaint.status === "In Progress") {
    throw new ApiError(400, "Cannot reassign a complaint that is in progress");
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

  const existingTask = await Task.findOne({
    complaintId: complaint.complaintId,
  });

  if (existingTask) {
    await assertComplaintEligibleForTaskAssignment(complaint.complaintId);
  }

  if (!existingTask) {
    await createTask({
      complaintId: complaint.complaintId,
      title: complaint.title,
      description: complaint.description ?? "",
      priority:
        complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
      assignedUserId: String(assignee.assignedUserId),
      dueDate: deadline ? new Date(deadline) : new Date(),
      remarks: `Auto-created from complaint ${complaint.complaintId}`,
      createdBy: req.user?.name ?? "Admin",
    });
  } else {
    await updateTaskById(
      String(existingTask._id),
      {
        assignedUserId: String(assignee.assignedUserId),
        dueDate: deadline ? new Date(deadline) : existingTask.dueDate,
        status: "Pending",
      },
      {
        id: req.user?.id ?? "",
        name: req.user?.name ?? "Admin",
        role: req.user?.role ?? "admin",
      }
    );
  }

  res.json({
    message: "Complaint assigned and task scheduled",
    complaint,
  });
}

export async function assignComplaintTeam(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { team } = req.body as { team?: string };

  if (!team?.trim()) {
    throw new ApiError(400, "Team is required");
  }

  const teamDoc = await resolveTeamByName(team);
  if (!teamDoc) {
    throw new ApiError(400, "Selected team does not exist. Create the team first.");
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Pending Review") {
    throw new ApiError(400, "Complaint must be confirmed from Alerts before assignment");
  }

  if (complaint.status === "Declined") {
    throw new ApiError(400, "Declined complaints cannot be assigned");
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

  complaint.history.push(
    buildHistoryEntry(
      isReassign ? "Team Reassigned" : "Complaint Assigned",
      req.user ?? { name: "Admin", role: "admin", team: teamDoc.teamName },
      {
        status: complaint.status,
        details: isReassign
          ? `Reassigned from ${previousTeam ?? "unassigned"} to ${teamDoc.teamName}`
          : `Assigned to ${teamDoc.teamName}`,
      }
    )
  );

  await complaint.save();

  const existingTask = await Task.findOne({ complaintId: complaint.complaintId });
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
  await syncComplaintTaskStatus(complaint.complaintId, "In Progress");
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
  await syncComplaintTaskStatus(complaint.complaintId, "Completed");

  res.json({ message: "Complaint completed", complaint });
}

export async function trackComplaint(req: Request, res: Response) {
  const complaint = await Complaint.findOne({ complaintId: req.params.complaintId });
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const hasFeedback = await hasFeedbackForComplaint(complaint.complaintId);

  res.json({ complaint, hasFeedback });
}

export async function submitFeedback(req: Request, res: Response) {
  const complaintId = String(req.params.complaintId);
  const { rating, comment } = req.body as { rating?: number; comment?: string };
  const feedback = await submitComplaintFeedback(complaintId, {
    rating: Number(rating),
    comment,
  });

  res.status(201).json({
    message: "Thank you for your feedback",
    feedback,
  });
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