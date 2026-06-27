export const taskStatuses = [
  "All",
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled",
  "Overdue",
  "Need Re-visit",
  "Need Material",
] as const;

export const taskPriorities = ["All", "Low", "Medium", "High", "Critical"] as const;

export function blocksTaskAssignment(taskScheduleStatus?: string | null) {
  return taskScheduleStatus === "Completed";
}

export function blocksComplaintReassignment(taskScheduleStatus?: string | null) {
  return taskScheduleStatus === "Completed" || taskScheduleStatus === "Cancelled";
}

export const REASSIGNABLE_TASK_STATUSES = [
  "Pending",
  "In Progress",
  "Overdue",
  "Need Re-visit",
  "Need Material",
] as const;



export const statusBadgeVariant: Record<

  string,

  "default" | "success" | "warning" | "danger" | "info"

> = {

  Pending: "warning",

  "In Progress": "info",

  Completed: "success",

  Cancelled: "default",

  Overdue: "danger",

  "Need Re-visit": "warning",

  "Need Material": "info",

};



export const priorityBadgeClass: Record<string, string> = {

  Low: "bg-slate-500/15 text-slate-300 border-slate-500/20",

  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/20",

  High: "bg-orange-500/15 text-orange-300 border-orange-500/20",

  Critical: "bg-red-500/15 text-red-300 border-red-500/20",

};



export const priorityAccentClass: Record<string, string> = {

  Low: "border-l-slate-400",

  Medium: "border-l-amber-400",

  High: "border-l-orange-500",

  Critical: "border-l-red-500",

};



export const PRIORITY_CALENDAR_COLORS: Record<string, string> = {

  Low: "#94A3B8",

  Medium: "#F59E0B",

  High: "#F97316",

  Critical: "#EF4444",

};



export const STATUS_CHART_COLORS: Record<string, string> = {

  Overdue: "#F59E0B",

  Pending: "#EF4444",

  "In Progress": "#EAB308",

  Completed: "#22C55E",

  "Need Re-visit": "#F97316",

  "Need Material": "#8B5CF6",

};



export const panelClass =

  "rounded-2xl border border-white/[0.08] bg-[rgba(10,20,35,0.55)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl";



/** Local calendar date as YYYY-MM-DD — avoids UTC off-by-one from toISOString(). */

export function toDateKey(date: Date) {

  const y = date.getFullYear();

  const m = String(date.getMonth() + 1).padStart(2, "0");

  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;

}



export function parseDateKey(key: string) {

  const [y, m, d] = key.split("-").map(Number);

  return new Date(y, m - 1, d);

}



export function formatDueDate(dateStr: string) {

  const date = dateStr.includes("-") && dateStr.length === 10

    ? parseDateKey(dateStr)

    : new Date(dateStr);

  return date.toLocaleDateString("en-GB", {

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



export function monthLabel(year: number, month: number) {

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {

    month: "long",

    year: "numeric",

  });

}



export function getCalendarDays(year: number, month: number) {

  const first = new Date(year, month - 1, 1);

  const last = new Date(year, month, 0);

  const startPad = (first.getDay() + 6) % 7;

  const days: Array<{ date: Date; inMonth: boolean }> = [];



  for (let i = startPad; i > 0; i -= 1) {

    const d = new Date(year, month - 1, 1 - i);

    days.push({ date: d, inMonth: false });

  }



  for (let d = 1; d <= last.getDate(); d += 1) {

    days.push({ date: new Date(year, month - 1, d), inMonth: true });

  }



  while (days.length % 7 !== 0) {

    const nextDay = last.getDate() + (days.length - startPad - last.getDate()) + 1;

    days.push({ date: new Date(year, month - 1, nextDay), inMonth: false });

  }



  return days;

}



export function priorityDotClass(priority: string) {

  switch (priority) {

    case "Critical":

      return "bg-red-500";

    case "High":

      return "bg-orange-500";

    case "Medium":

      return "bg-amber-400";

    default:

      return "bg-slate-400";

  }

}


