import Task from "../models/Task";
import Order from "../models/Order";
import { createComplaintAssignmentTask, syncComplaintTaskStatus } from "../services/taskService";
import { hasFeedbackForComplaint, submitComplaintFeedback } from "../services/feedbackService";
import { getActiveMaterialRequestsByComplaintIds } from "../services/materialRequestService";
import MaterialRequest from "../models/MaterialRequest";
import Payment from "../models/Payment";
import { resolveWorkflowStage, workflowStageFilter } from "../services/workflowService";
import { isMyTasksQueueItem, myTasksQueueSort } from "../services/myTasksQueueService";
import type { Request, Response } from "express";
import Complaint from "../models/Complaint";
import { generateComplaintId } from "../utils/complaintId";
import { ApiError } from "../utils/ApiError";
import type { AuthRequest } from "../middleware/auth";
import { complaintTeamFilter, isTeamRole } from "../utils/teamScope";
import * as userService from "../services/userService";
import { resolveTeamByName } from "../services/teamService";
import { lookupOrdersByPhone, lookupOrdersByOrderId } from "../services/orderService";
import { dateKeyFromValue } from "../utils/dateKey";
import {
  activeComplaintStatusFilter,
  closeActiveComplaintAssignments,
  getActiveTasksByComplaintIds,
  getMyTasksQueueTasksByComplaintIds,
  isTerminalComplaintStatus,
  recordComplaintAssignment,
  resetComplaintForNewAssignment,
  activeTaskQuery,
  type MyTasksQueueTask,
} from "../services/complaintAssignmentService";

const OPEN_COMPLAINT_STATUSES = [
  "Pending Review",
  "Pending Assignment",
  "Assigned",
  "In Progress",
  "Site Visit",
  "Material Required",
  "Material Granted",
  "Revisit"
] as const;

function normalizePhoneDigits(phone: string) {
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

async function applyWorkflowDisplayStatusFilter(filter: Record<string, unknown>, displayStatus: string) {
  const stage = workflowStageFilter(displayStatus);
  if (!stage) return false;

  const complaints = await Complaint.find({ status: { $ne: "Declined" } })
    .select("complaintId status")
    .lean();
  const complaintIds = complaints.map((c) => c.complaintId);

  const [tasks, materialMap] = await Promise.all([
    Task.find({ complaintId: { $in: complaintIds } }).select("complaintId status").lean(),
    getActiveMaterialRequestsByComplaintIds(complaintIds),
  ]);

  const taskByComplaint = new Map(tasks.map((t) => [t.complaintId, t]));
  const matchingIds = complaints
    .filter((c) => {
      const task = taskByComplaint.get(c.complaintId);
      const material = materialMap.get(c.complaintId);
      const workflowStage = resolveWorkflowStage({
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

export async function lookupOrdersForComplaint(req: Request, res: Response) {
  const phone = String(req.query.phone ?? "").trim();
  const orderId = String(req.query.orderId ?? "").trim();

  let orders: any[] = [];
  if (orderId) {
    orders = await lookupOrdersByOrderId(orderId);
  } else if (phone) {
    orders = await lookupOrdersByPhone(phone);
  }

  res.json({
    phone: phone ? normalizePhoneDigits(phone) : "",
    orderId,
    found: orders.length > 0,
    items: orders,
  });
}

export async function createComplaint(req: Request, res: Response) {
  const payload = req.body as Record<string, string>;
  const files = req.files as { picture?: Express.Multer.File[]; quotation?: Express.Multer.File[] } | undefined;
  const complaintId = await generateComplaintId();

  const clientName = payload.clientName?.trim() || payload.name?.trim();
  const orderId = payload.orderId?.trim() || "";
  const address = payload.address?.trim() || payload.location?.trim() || "";
  const email = payload.email?.trim() || "";
  const mobileNumber = payload.mobileNumber?.trim() || "";
  const availableDate = payload.availableDate?.trim() || "";
  const availableTime = payload.availableTime?.trim() || "";
  const complaintType = payload.complaintType?.trim() || payload.title?.trim() || "";
  const complaintDescription = payload.complaintDescription?.trim() || "";

  if (!clientName) throw new ApiError(400, "Name is required");
  if (!orderId) throw new ApiError(400, "Order ID is required");

  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new ApiError(400, "Order not found. Please select a valid order from your phone lookup.");
  }

  const orderPhone = normalizePhoneDigits(order.phone);
  const complaintPhone = normalizePhoneDigits(mobileNumber);
  if (orderPhone !== complaintPhone) {
    throw new ApiError(400, "Mobile number does not match the selected order record.");
  }

  if (!mobileNumber) throw new ApiError(400, "Mobile number is required");
  if (!address) throw new ApiError(400, "Address is required");
  if (!complaintType) throw new ApiError(400, "Complaint type is required");
  if (complaintType === "Other" && complaintDescription.length < 10) {
    throw new ApiError(400, "Please provide a description for other complaint types");
  }

  const pictureUrl = files?.picture?.[0] ? `/uploads/complaints/${files.picture[0].filename}` : "";
  const quotationUrl = files?.quotation?.[0] ? `/uploads/complaints/${files.quotation[0].filename}` : "";

  const availabilityNotes = payload.availability?.trim() || "";
  const timeSlot = payload.timeSlot?.trim() || "";
  const locationCoordinates = payload.locationCoordinates?.trim() || "";
  const assignedTeam = payload.assignedTeam?.trim() || "";
  const salesPerson = payload.salesPerson?.trim() || "";

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

let status: string = source === "WEBSITE" ? "Pending Review" : "Pending Assignment";
if (assignedTeam) {
  status = "Assigned";
}

const complaint = await Complaint.create({
  clientName,
  contactPerson: payload.contactPerson?.trim() || "",
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
    buildHistoryEntry(
      "Complaint Submitted",
      { name: clientName, role: "customer" },
      {
        status,
        details: assignedTeam ? `Submitted and assigned to ${assignedTeam}` : title,
      }
    ),
  ],
});

if (assignedTeam) {
  await createComplaintAssignmentTask({
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
  const isActiveAssignedScope = scope === "active_assigned" || scope === "my_tasks";
  const activeStatusFilter = activeComplaintStatusFilter();

  if (displayStatus && displayStatus !== "All") {
    const appliedWorkflowFilter = await applyWorkflowDisplayStatusFilter(filter, displayStatus);
    if (!appliedWorkflowFilter) {
      const appliedTaskFilter = await applyTaskDisplayStatusFilter(filter, displayStatus);
      if (!appliedTaskFilter) {
        applyDisplayStatusFilter(filter, displayStatus);
      }
    }
  } else {
    if (scope === "pending_review") {
      filter.status = "Pending Review";
    } else if (isActiveAssignedScope) {
      Object.assign(filter, activeStatusFilter);
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

    const statusFilter =
      displayStatus && displayStatus !== "All"
        ? await (async () => {
            const clause: Record<string, unknown> = {};
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
            : scope === "reviewed"
              ? { status: { $ne: "Pending Review" } }
              : {};

    const andClauses: Record<string, unknown>[] = [
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
  const queryTimeoutMs = 20_000;
  const listSelect =
    "complaintId clientName mobileNumber email orderId title description complaintType complaintDescription location assignedTeam assignedUserId assignedUserName status siteVisitStatus paymentStatus createdAt updatedAt assignedDate completedDate priority availableDate timeSlot assignedBy";
  const listSort = isActiveAssignedScope
    ? ({ assignedDate: -1, createdAt: -1, _id: -1 } as const)
    : ({ createdAt: -1, _id: -1 } as const);

  type ComplaintListRow = {
    complaintId: string;
    status: string;
    siteVisitStatus?: string;
    [key: string]: unknown;
  };

  let items: ComplaintListRow[];
  let total: number;

  try {
    [items, total] = await Promise.all([
      Complaint.find(filter)
        .select(listSelect)
        .sort(listSort)
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .maxTimeMS(queryTimeoutMs),
      Complaint.countDocuments(filter).maxTimeMS(queryTimeoutMs),
    ]);
  } catch {
    throw new ApiError(504, "Complaints query timed out. Please try again.");
  }

  if (!items.length) {
    res.json({ items: [], total, page: Number(page), limit: Number(limit) });
    return;
  }

  const complaintIds = items.map((item) => item.complaintId);
  const isQueueScope = scope === "my_tasks" || scope === "active_assigned";

  let taskByComplaintId:
    | Map<string, MyTasksQueueTask>
    | Awaited<ReturnType<typeof getActiveTasksByComplaintIds>> = new Map();
  let materialByComplaint: Awaited<ReturnType<typeof getActiveMaterialRequestsByComplaintIds>> = new Map();
  let materialPaymentMap = new Map<
    string,
    {
      paymentId: string;
      materialPaymentStatus?: string;
      totalAmount?: number;
      receivedAt?: Date;
    }
  >();

  try {
    if (isQueueScope) {
      taskByComplaintId = await getMyTasksQueueTasksByComplaintIds(complaintIds);
    } else {
      taskByComplaintId = await getActiveTasksByComplaintIds(complaintIds);
    }
  } catch {
    // Task lookup failed — list still returns complaint rows.
  }

  try {
    if (isQueueScope) {
      materialByComplaint = await Promise.race([
        getActiveMaterialRequestsByComplaintIds(complaintIds),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Complaint list enrichment timed out")), 3_000);
        }),
      ]);
    } else {
      const enrichment = await Promise.race([
        (async () => {
          const materials = await getActiveMaterialRequestsByComplaintIds(complaintIds);

          const paymentIds = [
            ...new Set(
              [...materials.values()]
                .map((request) => request?.paymentId)
                .filter(Boolean) as string[]
            ),
          ];

          const materialPayments =
            paymentIds.length > 0
              ? await Payment.find({ paymentId: { $in: paymentIds } })
                  .select("paymentId materialPaymentStatus totalAmount receivedAt serviceCost materialCost")
                  .lean()
                  .maxTimeMS(10_000)
              : [];

          return {
            materials,
            payments: materialPayments,
          };
        })(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Complaint list enrichment timed out")),
            8_000
          );
        }),
      ]);

      materialByComplaint = enrichment.materials;
      materialPaymentMap = new Map(
        enrichment.payments.map((payment) => [payment.paymentId, payment])
      );
    }
  } catch {
    // Return the complaint list even if material/payment enrichment is slow.
  }

  const enrichedItems = items.map((item) => {
    const task = taskByComplaintId.get(item.complaintId);
    const queueTask = isQueueScope ? (task as MyTasksQueueTask | undefined) : undefined;
    const materialRequest = materialByComplaint.get(item.complaintId);
    const linkedPayment = materialRequest?.paymentId
      ? materialPaymentMap.get(materialRequest.paymentId)
      : undefined;
    const workflowStage = resolveWorkflowStage({
      complaintStatus: item.status,
      taskStatus: task?.status ?? null,
      materialRequestStatus: materialRequest?.status ?? null,
      siteVisitStatus: item.siteVisitStatus ?? null,
    });
    return {
      ...item,
      taskScheduleStatus: task?.status ?? null,
      taskScheduleDueDate: task?.dueDateKey ?? task?.dueDate ?? null,
      taskId: task?.taskId ?? null,
      taskObjectId: task?._id ? String(task._id) : null,
      taskCreatedBy: task?.createdBy ?? null,
      taskCreatedAt: task?.createdAt ?? null,
      taskHistoryPreview: queueTask?.historyPreview ?? [],
      materialRequestStatus: materialRequest?.status ?? null,
      materialRequestId: materialRequest?.requestId ?? null,
      materialRequestObjectId: materialRequest?._id ? String(materialRequest._id) : null,
      materialPaymentStatus:
        linkedPayment?.materialPaymentStatus ??
        (materialRequest?.status === "PAYMENT_PENDING_ONSITE"
          ? "Payment Pending (Onsite)"
          : null),
      materialPaidAmount:
        linkedPayment?.materialPaymentStatus === "Payment Received"
          ? linkedPayment.totalAmount
          : null,
      materialPaymentDueAmount:
        linkedPayment?.materialPaymentStatus === "Payment Pending (Onsite)"
          ? linkedPayment.totalAmount
          : materialRequest?.status === "PAYMENT_PENDING_ONSITE"
            ? linkedPayment?.totalAmount ?? null
            : null,
      materialPaymentTime: linkedPayment?.receivedAt ?? null,
      workflowStage,
    };
  });

  const responseItems =
    scope === "my_tasks"
      ? enrichedItems.filter(isMyTasksQueueItem).sort(myTasksQueueSort)
      : scope === "active_assigned"
        ? enrichedItems.filter(isMyTasksQueueItem).sort(myTasksQueueSort)
        : enrichedItems;
  const responseTotal = total;

  res.json({ items: responseItems, total: responseTotal, page: Number(page), limit: Number(limit) });
}

function canAccessComplaint(
  user: { id: string; team?: string; teamName?: string; role?: string },
  complaint: { assignedUserId?: { toString(): string } | string | null; assignedTeam?: string | null }
) {
  if (user.role && (user.role === "super_admin" || user.role === "admin" || user.role === "sub_admin")) {
    return true;
  }

  const team = user.team ?? user.teamName;
  return Boolean(team && complaint.assignedTeam === team);
}

async function findComplaintByIdOrCid(id: string) {
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    const byId = await Complaint.findById(id);
    if (byId) return byId;
  }
  return await Complaint.findOne({ complaintId: id });
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

  const complaint = await findComplaintByIdOrCid(id as string);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (complaint.status === "Pending Review") {
    throw new ApiError(400, "Complaint must be confirmed from Alerts before assignment");
  }

  if (complaint.status === "Declined") {
    throw new ApiError(400, "Declined complaints cannot be assigned");
  }

  const wasTerminal = isTerminalComplaintStatus(complaint.status);
  const isReassign = Boolean(complaint.assignedUserId || complaint.assignedTeam);

  const assignee = assignedUserId
    ? await userService.resolveAssigneeById(assignedUserId)
    : { assignedUserId: undefined, assignedUserName: "", team: legacyTeam! };

  if (wasTerminal || isReassign) {
    closeActiveComplaintAssignments(
      complaint,
      wasTerminal && complaint.status === "Completed" ? "completed" : "reassigned"
    );
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
    resetComplaintForNewAssignment(complaint);
  } else {
    complaint.status = "Assigned";
  }

  const task = await createComplaintAssignmentTask({
    complaintId: complaint.complaintId,
    title: complaint.title,
    description: complaint.description ?? "",
    priority:
      complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
    assignedUserId: assignee.assignedUserId ? String(assignee.assignedUserId) : undefined,
    assignedTeamName: assignee.team,
    dueDate: deadline ? new Date(deadline) : new Date(),
    remarks: `Auto-created from complaint ${complaint.complaintId}`,
    createdBy: req.user?.name ?? "Admin",
  });

  recordComplaintAssignment(complaint, {
    assignedTeam: assignee.team,
    assignedUserId: assignee.assignedUserId,
    assignedUserName: assignee.assignedUserName,
    assignedBy: req.user?.name ?? "Admin",
    taskId: task.taskId,
  });

  complaint.history.push(
    buildHistoryEntry(
      isReassign || wasTerminal ? "Complaint Reassigned" : "Complaint Assigned",
      req.user ?? { name: "Admin", role: "admin", team: assignee.team },
      {
        status: complaint.status,
        details: assignee.assignedUserName
          ? `${isReassign || wasTerminal ? "Reassigned" : "Assigned"} to ${assignee.assignedUserName} (${assignee.team})`
          : `${isReassign || wasTerminal ? "Reassigned" : "Assigned"} to ${assignee.team}`,
      }
    )
  );

  await complaint.save();

  res.json({
    message: isReassign || wasTerminal ? "Complaint reassigned and task scheduled" : "Complaint assigned and task scheduled",
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

  const complaint = await findComplaintByIdOrCid(id as string);
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
  const wasTerminal = isTerminalComplaintStatus(complaint.status);
  const previousTeam = complaint.assignedTeam;

  if (wasTerminal || isReassign) {
    closeActiveComplaintAssignments(
      complaint,
      wasTerminal && complaint.status === "Completed" ? "completed" : "reassigned"
    );
  }

  complaint.assignedTeam = teamDoc.teamName;
  complaint.assignedUserId = undefined;
  complaint.assignedUserName = "";
  complaint.assignedBy = req.user?.name ?? "Admin";
  complaint.assignedDate = new Date();

  if (wasTerminal || complaint.status !== "In Progress") {
    resetComplaintForNewAssignment(complaint);
  } else {
    complaint.status = "Assigned";
  }

  const task = await createComplaintAssignmentTask({
    complaintId: complaint.complaintId,
    title: complaint.title,
    description: complaint.description ?? "",
    priority:
      complaint.priority === "High" ? "High" : complaint.priority === "Low" ? "Low" : "Medium",
    assignedTeamName: teamDoc.teamName,
    dueDate: new Date(),
    remarks: `Auto-created from complaint ${complaint.complaintId}`,
    createdBy: req.user?.name ?? "Admin",
  });

  recordComplaintAssignment(complaint, {
    assignedTeam: teamDoc.teamName,
    assignedUserName: "",
    assignedBy: req.user?.name ?? "Admin",
    taskId: task.taskId,
  });

  complaint.history.push(
    buildHistoryEntry(
      isReassign || wasTerminal ? "Team Reassigned" : "Complaint Assigned",
      req.user ?? { name: "Admin", role: "admin", team: teamDoc.teamName },
      {
        status: complaint.status,
        details: isReassign || wasTerminal
          ? `Reassigned from ${previousTeam ?? "unassigned"} to ${teamDoc.teamName}`
          : `Assigned to ${teamDoc.teamName}`,
      }
    )
  );

  await complaint.save();

  res.json({
    message: isReassign || wasTerminal ? "Team reassigned successfully" : "Team assigned successfully",
    complaint,
  });
}

export async function startComplaint(req: AuthRequest, res: Response) {
  const complaint = await findComplaintByIdOrCid(req.params.id as string);
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
  const complaint = await findComplaintByIdOrCid(req.params.id as string);
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
  const complaint = await findComplaintByIdOrCid(req.params.id as string);
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
  closeActiveComplaintAssignments(complaint, "completed");
  complaint.history.push(buildHistoryEntry("Task Completed", actor, { status: "Completed", remarks: completionRemarks ?? "", details: resolutionDetails ?? "" }));
  await complaint.save();
  await syncComplaintTaskStatus(complaint.complaintId, "Completed");

  res.json({ message: "Complaint completed", complaint });
}

export async function trackComplaint(req: Request, res: Response) {
  const complaint = await Complaint.findOne({ complaintId: req.params.complaintId }).lean();
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const [hasFeedback, task] = await Promise.all([
    hasFeedbackForComplaint(complaint.complaintId),
    Task.findOne(activeTaskQuery(complaint.complaintId)).sort({ createdAt: -1 }).lean()
  ]);

  res.json({
    complaint: {
      ...complaint,
      taskHistory: task?.history ?? []
    },
    hasFeedback
  });
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
  const complaint = await findComplaintByIdOrCid(req.params.id as string);
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
  const complaint = await findComplaintByIdOrCid(req.params.id as string);
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

export async function scheduleRevisit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { date, timeSlot, team, remarks } = req.body as {
    date: string;
    timeSlot: string;
    team: string;
    remarks?: string;
  };

  const complaint = await findComplaintByIdOrCid(id as string);
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const actor = req.user || { name: "Admin", role: "admin" };
  const previousTeam = complaint.assignedTeam;
  const teamChanged = Boolean(previousTeam && previousTeam !== team);

  if (complaint.assignedTeam || complaint.assignedUserId) {
    closeActiveComplaintAssignments(complaint, "reassigned");
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
  if (remarks) complaint.remarks = remarks;

  complaint.history.push(
    buildHistoryEntry("Revisit Scheduled", actor, {
      status: "Assigned",
      remarks: remarks || "",
      details: `Revisit scheduled for ${date} at ${timeSlot} with team ${team}`,
    })
  );

  const task = await createComplaintAssignmentTask({
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

  recordComplaintAssignment(complaint, {
    assignedTeam: team,
    assignedUserId: complaint.assignedUserId ?? undefined,
    assignedUserName: complaint.assignedUserName ?? "",
    assignedBy: actor.name,
    taskId: task.taskId,
  });

  await complaint.save();

  res.json({ message: "Revisit scheduled successfully", complaint });
}

function buildClientHistoryFilter(q: string) {
  const phoneDigits = normalizePhoneDigits(q);
  const orFilters: Record<string, unknown>[] = [
    { complaintId: { $regex: q, $options: "i" } },
    { orderId: { $regex: q, $options: "i" } },
    { clientName: { $regex: q, $options: "i" } },
  ];
  if (phoneDigits.length >= 10) {
    orFilters.push({ mobileNumber: { $regex: phoneDigits } });
  }
  return { $or: orFilters };
}

export async function getClientHistory(req: AuthRequest, res: Response) {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page ?? "1") || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? "12") || 12));

  if (!q) {
    throw new ApiError(400, "Search by phone number, complaint ID, or order ID");
  }

  const filter = buildClientHistoryFilter(q);
  const skip = (page - 1) * limit;

  const [total, complaints, primary, distinctIds] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter)
      .select(
        "_id complaintId clientName mobileNumber email orderId createdAt title description priority location assignedTeam assignedUserName status siteVisitStatus"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.findOne(filter).sort({ createdAt: -1 }).lean(),
    Complaint.distinct("complaintId", filter),
  ]);

  if (!total || !primary) {
    throw new ApiError(404, "No client record found for this search");
  }

  const complaintIds = complaints.map((c) => c.complaintId);
  const [linkedTasks, materialByComplaint, taskCount, materialCount, paymentCount] =
    await Promise.all([
      complaintIds.length
        ? Task.find({ complaintId: { $in: complaintIds } })
            .select("complaintId taskId status dueDate dueDateKey")
            .lean()
        : Promise.resolve([]),
      getActiveMaterialRequestsByComplaintIds(complaintIds),
      Task.countDocuments({ complaintId: { $in: distinctIds } }),
      MaterialRequest.countDocuments({ complaintId: { $in: distinctIds } }),
      Payment.countDocuments({ complaintId: { $in: distinctIds } }),
    ]);

  const taskByComplaintId = new Map(linkedTasks.map((task) => [task.complaintId, task]));

  const summaries = complaints.map((item) => {
    const task = taskByComplaintId.get(item.complaintId);
    const materialRequest = materialByComplaint.get(item.complaintId);
    const workflowStage = resolveWorkflowStage({
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

export async function getClientHistoryComplaintDetail(req: AuthRequest, res: Response) {
  const complaintId = String(req.params.complaintId ?? "").trim();
  if (!complaintId) {
    throw new ApiError(400, "Complaint ID is required");
  }

  const complaint = await Complaint.findOne({ complaintId }).lean();
  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  const [tasks, materialRequests, payments, order, hasFeedback] = await Promise.all([
    Task.find({ complaintId }).sort({ createdAt: -1 }).lean(),
    MaterialRequest.find({ complaintId }).sort({ createdAt: -1 }).lean(),
    Payment.find({ complaintId }).sort({ createdAt: -1 }).lean(),
    complaint.orderId ? Order.findOne({ orderId: complaint.orderId }).lean() : null,
    hasFeedbackForComplaint(complaintId),
  ]);

  const primaryTask =
    tasks.find((task) => task.isActive !== false) ?? tasks[0];
  const materialRequest = materialRequests[0];
  const linkedMaterialPayment = materialRequest?.paymentId
    ? await Payment.findOne({ paymentId: materialRequest.paymentId })
        .select("paymentId materialPaymentStatus totalAmount receivedAt serviceCost materialCost handoverDate serviceType materials auditHistory")
        .lean()
    : null;
  const workflowStage = resolveWorkflowStage({
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
    materialPayment: linkedMaterialPayment
      ? {
          paymentId: linkedMaterialPayment.paymentId,
          paymentStatus: linkedMaterialPayment.materialPaymentStatus,
          paidAmount:
            linkedMaterialPayment.materialPaymentStatus === "Payment Received"
              ? linkedMaterialPayment.totalAmount
              : null,
          paymentTime: linkedMaterialPayment.receivedAt ?? null,
          serviceFee: linkedMaterialPayment.serviceCost ?? 0,
          materialTotal: linkedMaterialPayment.materialCost ?? 0,
          grandTotal: linkedMaterialPayment.totalAmount ?? 0,
          serviceType: linkedMaterialPayment.serviceType,
          handoverDate: linkedMaterialPayment.handoverDate ?? order?.deliveryDate ?? null,
          materials: linkedMaterialPayment.materials ?? [],
          auditHistory: linkedMaterialPayment.auditHistory ?? [],
        }
      : null,
    materialRequestObjectId: materialRequest?._id ? String(materialRequest._id) : null,
    order,
    hasFeedback,
  });
}
