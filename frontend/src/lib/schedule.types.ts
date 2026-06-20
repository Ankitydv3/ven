export type ScheduleStatus =
  | "Scheduled"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue";

export type SchedulePriority = "Low" | "Medium" | "High" | "Critical";

export type CalendarView = "day" | "week" | "month";

export interface TaskSchedule {
  _id: string;
  taskId: string;
  complaintId?: string;
  complaintTitle?: string;
  orderId?: string;
  customerName: string;
  serviceType: string;
  team: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  priority: SchedulePriority;
  status: ScheduleStatus;
  remarks?: string;
  assignedBy: string;
  assignedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleFilters {
  q?: string;
  team?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ScheduleListResponse {
  items: TaskSchedule[];
  total: number;
  page: number;
  limit: number;
}

export interface ScheduleMutationResponse {
  message: string;
  schedule: TaskSchedule;
}

export interface ScheduleStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  scheduled: number;
  percentChange: number;
  trend: "up" | "down";
}

export interface SchedulePayload {
  complaintId?: string;
  complaintTitle?: string;
  orderId?: string;
  customerName: string;
  serviceType: string;
  team: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  priority: SchedulePriority;
  status?: ScheduleStatus;
  remarks?: string;
}

export interface CalendarFilters {
  startDate: string;
  endDate: string;
  team?: string;
}
