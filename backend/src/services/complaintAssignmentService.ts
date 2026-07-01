import type { Types } from "mongoose";
import Complaint from "../models/Complaint";
import Task from "../models/Task";

export const TERMINAL_COMPLAINT_STATUSES = [
  "Completed",
  "Cancelled",
  "Declined",
  "Pending Review",
] as const;

export function activeComplaintStatusFilter() {
  return {
    status: { $nin: [...TERMINAL_COMPLAINT_STATUSES] },
  };
}

export function isTerminalComplaintStatus(status?: string | null) {
  return TERMINAL_COMPLAINT_STATUSES.includes(
    status as (typeof TERMINAL_COMPLAINT_STATUSES)[number]
  );
}

export async function supersedeComplaintTasks(complaintId: string) {
  await Task.updateMany(
    {
      complaintId,
      ...activeTaskQuery(),
    },
    { $set: { isActive: false } }
  );
}

export function activeTaskQuery(complaintId?: string) {
  const base: Record<string, unknown> = {
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

type ComplaintAssignmentDoc = {
  assignedTeam?: string;
  assignedUserId?: Types.ObjectId | string | null;
  assignedUserName?: string;
  assignedBy?: string;
  assignedAt?: Date;
  endedAt?: Date;
  endReason?: string;
  taskId?: string;
  status?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function closeActiveComplaintAssignments(complaint: any, endReason: "completed" | "reassigned" | "cancelled") {
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
export function resetComplaintForNewAssignment(complaint: any) {
  complaint.status = "Assigned";
  complaint.completedBy = "";
  complaint.completedDate = undefined;
  complaint.resolutionDetails = "";
  complaint.completionPictureUrl = "";
  complaint.siteVisitStatus = "Pending";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recordComplaintAssignment(complaint: any, input: {
    assignedTeam: string;
    assignedUserId?: Types.ObjectId | string;
    assignedUserName: string;
    assignedBy: string;
    taskId: string;
  }
) {
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

export async function getActiveTaskForComplaint(complaintId: string) {
  return Task.findOne(activeTaskQuery(complaintId))
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActiveTasksByComplaintIds(complaintIds: string[]) {
  if (!complaintIds.length) return new Map<string, Awaited<ReturnType<typeof getActiveTaskForComplaint>>>();

  const tasks = await Task.find({
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

  const map = new Map<string, (typeof tasks)[number]>();
  for (const task of tasks) {
    if (!task.complaintId) continue;
    if (!map.has(task.complaintId)) {
      map.set(task.complaintId, task);
    }
  }
  return map;
}

export type MyTasksQueueTask = {
  _id: Types.ObjectId;
  complaintId: string;
  taskId: string;
  status: string;
  dueDate?: Date;
  dueDateKey?: string;
  assignedUserId?: Types.ObjectId | null;
  assignedUserName?: string;
  assignedTeamName?: string;
  createdBy?: string;
  createdAt?: Date;
  description?: string;
  remarks?: string;
  priority?: string;
  historyPreview: Array<{
    action: string;
    by: string;
    role?: string;
    status: string;
    remarks?: string;
    createdAt?: Date;
  }>;
};

/** Rich task payload for My Tasks queue — includes timeline text without photo blobs. */
export async function getMyTasksQueueTasksByComplaintIds(complaintIds: string[]) {
  if (!complaintIds.length) {
    return new Map<string, MyTasksQueueTask>();
  }

  const rows = await Task.aggregate<MyTasksQueueTask>([
    {
      $match: {
        complaintId: { $in: complaintIds },
        $or: [
          { isActive: true },
          { isActive: { $exists: false }, status: { $nin: ["Completed", "Cancelled"] } },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$complaintId",
        doc: { $first: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: "$doc._id",
        complaintId: "$doc.complaintId",
        taskId: "$doc.taskId",
        status: "$doc.status",
        dueDate: "$doc.dueDate",
        dueDateKey: "$doc.dueDateKey",
        assignedUserId: "$doc.assignedUserId",
        assignedUserName: "$doc.assignedUserName",
        assignedTeamName: "$doc.assignedTeamName",
        createdBy: "$doc.createdBy",
        createdAt: "$doc.createdAt",
        description: "$doc.description",
        remarks: "$doc.remarks",
        priority: "$doc.priority",
        historyPreview: {
          $map: {
            input: { $slice: [{ $ifNull: ["$doc.history", []] }, -20] },
            as: "entry",
            in: {
              action: "$$entry.action",
              by: "$$entry.by",
              role: "$$entry.role",
              status: "$$entry.status",
              remarks: "$$entry.remarks",
              createdAt: "$$entry.createdAt",
            },
          },
        },
      },
    },
  ]).option({ maxTimeMS: 10_000 });

  return new Map(rows.map((row) => [row.complaintId, row]));
}
