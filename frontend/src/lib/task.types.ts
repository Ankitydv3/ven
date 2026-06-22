export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue"
  | "Need Re-visit"
  | "Need Material";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export interface TaskHistoryEntry {
  action: string;
  by: string;
  role?: string;
  status: string;
  remarks?: string;
  photoUrl?: string;
  createdAt?: string;
}

export interface TaskComplaint {
  complaintId: string;
  clientName: string;
  contactPerson?: string;
  mobileNumber: string;
  email?: string;
  title: string;
  description: string;
  priority: string;
  location: string;
  assignedBy?: string;
  assignedDate?: string;
  history?: Array<{
    action: string;
    by: string;
    status: string;
    createdAt?: string;
  }>;
}

export interface Task {
  _id: string;
  taskId: string;
  complaintId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  createdBy: string;
  dueDate: string;
  dueDateKey?: string;
  completedAt?: string;
  remarks?: string;
  isLocked?: boolean;
  history?: TaskHistoryEntry[];
  complaint?: TaskComplaint | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskFilters {
  q?: string;
  team?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskMutationResponse {
  message: string;
  task: Task;
}

export interface TaskStats {
  total: number;
  upcoming: number;
  dueToday: number;
  pending: number;
  pendingRate: number;
  inProgress: number;
  completed: number;
  completedToday: number;
  needRevisit: number;
  needMaterial: number;
  completedOnTime: number;
  completedOnTimeRate: number;
  overdue: number;
  overdueRate: number;
  completionRate: number;
  statusBreakdown: {
    overdue: number;
    pending: number;
    inProgress: number;
    completed: number;
    needRevisit?: number;
    needMaterial?: number;
  };
}

export interface TaskPayload {
  complaintId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedUserId: string;
  dueDate: string;
  remarks?: string;
}

export interface CalendarDayCount {
  date: string;
  count: number;
  overdue: number;
  completed: number;
  byPriority?: Record<string, number>;
  dominantPriority?: string;
}
