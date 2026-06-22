export const scheduleStatuses = [
  "All",
  "Scheduled",
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled",
  "Overdue",
] as const;

export const schedulePriorities = ["All", "Low", "Medium", "High", "Critical"] as const;

const TEAM_COLOR_PALETTE = [
  {
    bg: "bg-violet-500/15",
    border: "border-violet-500/40",
    text: "text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/40",
    text: "text-cyan-600 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  {
    bg: "bg-orange-500/15",
    border: "border-orange-500/40",
    text: "text-orange-600 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-pink-500/15",
    border: "border-pink-500/40",
    text: "text-pink-600 dark:text-pink-300",
    dot: "bg-pink-500",
  },
  {
    bg: "bg-teal-500/15",
    border: "border-teal-500/40",
    text: "text-teal-600 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-purple-500/15",
    border: "border-purple-500/40",
    text: "text-purple-600 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
  },
] as const;

export type TeamColorStyle = (typeof TEAM_COLOR_PALETTE)[number];

function hashTeamName(teamName: string) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i += 1) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getTeamColorStyle(teamName: string): TeamColorStyle {
  return TEAM_COLOR_PALETTE[hashTeamName(teamName) % TEAM_COLOR_PALETTE.length];
}

/** @deprecated Use getTeamColorStyle(teamName) for dynamic teams */
export const teamColors: Record<string, TeamColorStyle> = {};

export const statusBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  Scheduled: "info",
  Pending: "warning",
  "In Progress": "info",
  Completed: "success",
  Cancelled: "default",
  Overdue: "danger",
};

export const glassCardClass =
  "rounded-2xl border border-slate-200 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0A1F1A]/80 dark:shadow-black/20";

export const primaryButtonClass =
  "bg-[#2F6B63] text-white shadow-md shadow-[#2F6B63]/25 hover:bg-[#285e57]";

export const accentTextClass = "text-[#2F6B63] dark:text-[#4F9B8C]";

export const HOUR_HEIGHT = 56;
export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 18;

export function formatTime12h(time24: string) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
