import TaskSchedule from "../models/TaskSchedule";
import Complaint from "../models/Complaint";
import { generateTaskScheduleId } from "../utils/taskScheduleId";
import { ApiError } from "../utils/ApiError";

export type ScheduleStatus =
  | "Scheduled"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue";

export type SchedulePriority = "Low" | "Medium" | "High" | "Critical";

export interface SchedulePayload {
  complaintId?: string;
  orderId?: string;
  customerName: string;
  serviceType: string;
  team: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  priority?: SchedulePriority;
  status?: ScheduleStatus;
  remarks?: string;
  assignedBy: string;
}

export interface ScheduleListOptions {
  q?: string;
  team?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

export interface CalendarOptions {
  startDate: string;
  endDate: string;
  team?: string;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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

export function computeAutoStatus(
  schedule: {
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    status: ScheduleStatus;
  },
  now = new Date()
): ScheduleStatus {
  if (schedule.status === "Completed" || schedule.status === "Cancelled") {
    return schedule.status;
  }

  const scheduledDay = startOfDay(new Date(schedule.scheduledDate));
  const today = startOfDay(now);

  if (today.getTime() === scheduledDay.getTime()) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const endMinutes = parseTimeToMinutes(schedule.endTime);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return "In Progress";
    }
  }

  if (today.getTime() > scheduledDay.getTime()) {
    return "Overdue";
  }

  if (schedule.status === "Overdue" || schedule.status === "In Progress") {
    return "Scheduled";
  }

  return schedule.status === "Pending" ? "Pending" : "Scheduled";
}

export async function applyAutoStatusUpdates() {
  const activeSchedules = await TaskSchedule.find({
    status: { $nin: ["Completed", "Cancelled"] }
  });

  const bulkOps = activeSchedules
    .map((schedule) => {
      const nextStatus = computeAutoStatus({
        scheduledDate: schedule.scheduledDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status as ScheduleStatus
      });

      if (nextStatus !== schedule.status) {
        return {
          updateOne: {
            filter: { _id: schedule._id },
            update: { $set: { status: nextStatus } }
          }
        };
      }

      return null;
    })
    .filter(Boolean);

  if (bulkOps.length > 0) {
    await TaskSchedule.bulkWrite(bulkOps as Parameters<typeof TaskSchedule.bulkWrite>[0]);
  }
}

function withResolvedStatus<T extends { scheduledDate: Date; startTime: string; endTime: string; status: string }>(
  schedule: T
) {
  return {
    ...schedule,
    status: computeAutoStatus({
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status as ScheduleStatus
    })
  };
}

async function syncComplaintAssignment(
  complaintRef: string,
  team: string,
  assignedBy: string,
  remarks?: string
) {
  const complaint = complaintRef.startsWith("CMP-")
    ? await Complaint.findOne({ complaintId: complaintRef })
    : await Complaint.findById(complaintRef);

  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  complaint.assignedTeam = team;
  complaint.assignedBy = assignedBy;
  complaint.assignedDate = new Date();
  complaint.status = "Assigned";
  if (remarks) {
    complaint.remarks = remarks;
  }

  complaint.history.push({
    action: "Complaint Assigned",
    by: assignedBy,
    role: "admin",
    remarks: remarks ?? "",
    details: `Assigned to ${team} with schedule`,
    status: "Assigned",
    createdAt: new Date()
  });

  await complaint.save();
  return complaint;
}

export async function createSchedule(payload: SchedulePayload) {
  const taskId = await generateTaskScheduleId();

  const schedule = await TaskSchedule.create({
    ...payload,
    taskId,
    priority: payload.priority ?? "Medium",
    status: payload.status ?? "Scheduled",
    assignedAt: new Date()
  });

  if (payload.complaintId) {
    await syncComplaintAssignment(payload.complaintId, payload.team, payload.assignedBy, payload.remarks);
  }

  return withResolvedStatus(schedule.toObject());
}

export async function getSchedules(options: ScheduleListOptions) {
  await applyAutoStatusUpdates();

  const filter: Record<string, unknown> = {};

  if (options.q) {
    filter.$or = [
      { taskId: { $regex: options.q, $options: "i" } },
      { orderId: { $regex: options.q, $options: "i" } },
      { customerName: { $regex: options.q, $options: "i" } },
      { serviceType: { $regex: options.q, $options: "i" } },
      { team: { $regex: options.q, $options: "i" } }
    ];
  }

  if (options.team && options.team !== "All") {
    filter.team = options.team;
  }

  if (options.status && options.status !== "All") {
    filter.status = options.status;
  }

  if (options.priority && options.priority !== "All") {
    filter.priority = options.priority;
  }

  if (options.startDate || options.endDate) {
    filter.scheduledDate = {};
    if (options.startDate) {
      (filter.scheduledDate as Record<string, Date>).$gte = startOfDay(new Date(options.startDate));
    }
    if (options.endDate) {
      (filter.scheduledDate as Record<string, Date>).$lte = endOfDay(new Date(options.endDate));
    }
  }

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    TaskSchedule.find(filter).sort(sort).skip(skip).limit(options.limit).lean(),
    TaskSchedule.countDocuments(filter)
  ]);

  return {
    items: items.map((item) => withResolvedStatus(item)),
    total
  };
}

export async function getScheduleById(id: string) {
  await applyAutoStatusUpdates();
  const schedule = await TaskSchedule.findById(id).lean();
  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }
  return withResolvedStatus(schedule);
}

export async function getCalendarSchedules(options: CalendarOptions) {
  await applyAutoStatusUpdates();

  const filter: Record<string, unknown> = {
    scheduledDate: {
      $gte: startOfDay(new Date(options.startDate)),
      $lte: endOfDay(new Date(options.endDate))
    }
  };

  if (options.team && options.team !== "All") {
    filter.team = options.team;
  }

  const items = await TaskSchedule.find(filter).sort({ scheduledDate: 1, startTime: 1 }).lean();
  return items.map((item) => withResolvedStatus(item));
}

export async function getScheduleStats(startDate?: string, endDate?: string) {
  await applyAutoStatusUpdates();

  const dateFilter: Record<string, Date> = {};
  if (startDate) {
    dateFilter.$gte = startOfDay(new Date(startDate));
  }
  if (endDate) {
    dateFilter.$lte = endOfDay(new Date(endDate));
  }

  const filter = Object.keys(dateFilter).length ? { scheduledDate: dateFilter } : {};

  const statuses: ScheduleStatus[] = [
    "Scheduled",
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
    "Overdue"
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => ({
      status,
      count: await TaskSchedule.countDocuments({ ...filter, status })
    }))
  );

  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const completed = counts.find((item) => item.status === "Completed")?.count ?? 0;
  const inProgress = counts.find((item) => item.status === "In Progress")?.count ?? 0;
  const pending = counts.find((item) => item.status === "Pending")?.count ?? 0;
  const overdue = counts.find((item) => item.status === "Overdue")?.count ?? 0;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [currentWeekTotal, previousWeekTotal] = await Promise.all([
    TaskSchedule.countDocuments({ createdAt: { $gte: weekAgo } }),
    TaskSchedule.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } })
  ]);

  const percentChange =
    previousWeekTotal === 0
      ? currentWeekTotal > 0
        ? 100
        : 0
      : Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100);

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    scheduled: counts.find((item) => item.status === "Scheduled")?.count ?? 0,
    percentChange,
    trend: (percentChange >= 0 ? "up" : "down") as "up" | "down"
  };
}

export async function updateScheduleById(
  id: string,
  payload: Partial<SchedulePayload> & { status?: ScheduleStatus; completedAt?: Date }
) {
  const updateData: Record<string, unknown> = { ...payload };

  if (payload.status === "Completed" && !payload.completedAt) {
    updateData.completedAt = new Date();
  }

  const schedule = await TaskSchedule.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  }).lean();

  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  if (payload.complaintId && payload.team) {
    await syncComplaintAssignment(
      payload.complaintId,
      payload.team,
      payload.assignedBy ?? schedule.assignedBy,
      payload.remarks
    );
  }

  return withResolvedStatus(schedule);
}

export async function deleteScheduleById(id: string) {
  const schedule = await TaskSchedule.findByIdAndDelete(id);
  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }
  return schedule;
}
