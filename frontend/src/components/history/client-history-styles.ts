import type { WorkflowStage } from "@/lib/workflow";
import { workflowStageBadgeClass } from "@/lib/workflow";

export const historyCardAccentClass: Record<string, string> = {
  "Pending Review":
    "border-l-rose-500 hover:border-rose-500/40 hover:shadow-rose-500/10 dark:border-l-rose-500",
  "Pending Assignment":
    "border-l-rose-400 hover:border-rose-400/40 hover:shadow-rose-400/10 dark:border-l-rose-400",
  Assigned:
    "border-l-blue-500 hover:border-blue-500/40 hover:shadow-blue-500/10 dark:border-l-blue-500",
  "In Progress":
    "border-l-orange-500 hover:border-orange-500/40 hover:shadow-orange-500/10 dark:border-l-orange-500",
  Completed:
    "border-l-emerald-500 hover:border-emerald-500/40 hover:shadow-emerald-500/10 dark:border-l-emerald-500",
  Cancelled:
    "border-l-slate-500 hover:border-slate-500/40 hover:shadow-slate-500/10 dark:border-l-slate-500",
  Declined:
    "border-l-red-500 hover:border-red-500/40 hover:shadow-red-500/10 dark:border-l-red-500",
  "Site Visit":
    "border-l-purple-500 hover:border-purple-500/40 hover:shadow-purple-500/10 dark:border-l-purple-500",
  "Material Required":
    "border-l-amber-500 hover:border-amber-500/40 hover:shadow-amber-500/10 dark:border-l-amber-500",
  "Material Granted":
    "border-l-cyan-500 hover:border-cyan-500/40 hover:shadow-cyan-500/10 dark:border-l-cyan-500",
  Revisit:
    "border-l-indigo-500 hover:border-indigo-500/40 hover:shadow-indigo-500/10 dark:border-l-indigo-500",
  "Awaiting Reassignment":
    "border-l-fuchsia-500 hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/10 dark:border-l-fuchsia-500",
};

export function getHistoryCardAccent(stage: string) {
  return (
    historyCardAccentClass[stage] ??
    "border-l-slate-400 hover:border-slate-400/40 hover:shadow-slate-500/10 dark:border-l-slate-400"
  );
}

export function getHistoryStatusBadgeClass(stage: string) {
  return (
    workflowStageBadgeClass[stage as WorkflowStage] ??
    "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400"
  );
}

export const priorityBadgeClass: Record<string, string> = {
  High: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  Medium: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  Low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
};
