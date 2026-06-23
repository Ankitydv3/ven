import { api } from "@/lib/api";

export interface ReportsGrowth {
  growth: string;
  trend: "up" | "down";
}

export interface ReportsSummary {
  totalTasksAssigned: number;
  completedTasks: number;
  growth: {
    totalTasksAssigned: ReportsGrowth;
    completedTasks: ReportsGrowth;
  };
  dateRange: { startDate: string; endDate: string };
  teams: string[];
}

export interface TeamPerformanceRow {
  team: string;
  teamColor: string;
  tasksAssigned: number;
  completed: number;
  completionRate: string;
  isTotal?: boolean;
}

export interface TaskStatusItem {
  name: string;
  value: number;
  percent: string;
  color: string;
}

export interface TaskStatusData {
  total: number;
  items: TaskStatusItem[];
}

export interface TeamTasksItem {
  team: string;
  assigned: number;
  completed: number;
}

export interface FeedbackSummary {
  positiveCount: number;
  negativeCount: number;
  totalFeedback: number;
  averageRating: number;
  growth: {
    totalFeedback: ReportsGrowth;
  };
}

export interface UserFeedbackRow {
  userName: string;
  assignedUserId: string;
  team: string;
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  averageRating: number;
}

export interface FeedbackItem {
  feedbackId: string;
  complaintId?: string;
  customerName: string;
  team: string;
  assignedUserName: string;
  sentiment: "Positive" | "Negative";
  rating?: number;
  comment?: string;
  createdAt?: string;
}

export interface FeedbackData {
  summary: FeedbackSummary;
  userPerformance: UserFeedbackRow[];
  positive: FeedbackItem[];
  negative: FeedbackItem[];
}

export interface ReportsData {
  summary: ReportsSummary;
  teamPerformance: TeamPerformanceRow[];
  taskStatus: TaskStatusData;
  teamTasks: TeamTasksItem[];
  feedback: FeedbackData;
}

export interface ReportsFilters {
  startDate?: string;
  endDate?: string;
  team?: string;
}

export async function fetchReports(filters?: ReportsFilters): Promise<ReportsData> {
  const { data } = await api.get<ReportsData>("/reports", { params: filters });
  return data;
}

export async function exportReportsCSV(filters?: ReportsFilters): Promise<Blob> {
  const { data } = await api.get("/reports/export", {
    params: filters,
    responseType: "blob",
  });
  return data;
}
