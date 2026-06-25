"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Search,
  TriangleAlert,
  Users,
  XCircle,
  Bell,
  ChevronRight,
  SlidersHorizontal,
  Zap,
  Activity,
  CalendarDays,
  Tag,
  User,
  FileText,
  AlertCircle,
  ArrowUpRight,
  CheckCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TeamSelectItems } from "@/components/shared/TeamSelectItems";
import type { AlertsResponse, Complaint, Priority, TeamReport } from "@/lib/types";
import { useAlerts, useConfirmComplaint, useDeclineComplaint } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── helpers ─────────────────────────────────────────── */

function priorityBadgeClass(priority?: Priority | string) {
  if (priority === "High") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (priority === "Medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
}

function priorityBar(priority?: Priority | string) {
  if (priority === "High") return "bg-rose-500";
  if (priority === "Medium") return "bg-amber-500";
  return "bg-emerald-500";
}

function statusIcon(status: TeamReport["status"]) {
  if (status === "all_complete") return { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (status === "has_pending") return { Icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" };
  return { Icon: Users, color: "text-slate-400", bg: "bg-slate-500/10" };
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97 },
};

/* ─── Detail Field helper ─────────────────────────────── */

function DetailField({ icon: Icon, label, value, mono }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">{label}</p>
        <p className={cn("text-sm text-slate-200 break-words", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Team Report Row ─────────────────────────────────── */

function TeamReportRow({
  report,
  index,
  onClick,
}: {
  report: TeamReport;
  index: number;
  onClick: () => void;
}) {
  const { Icon, color, bg } = statusIcon(report.status);
  const progress = report.totalTasks > 0
    ? Math.round((report.completedTasks / report.totalTasks) * 100)
    : 0;

  return (
    <motion.button
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className="group w-full cursor-pointer rounded-2xl border border-blue-500/10 bg-[#080f1e]/70 p-4 text-left backdrop-blur-md transition-all duration-200 hover:border-blue-500/30 hover:bg-[#0b1628]/80 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-white">{report.team}</p>
            <span className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              report.status === "all_complete"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : report.status === "has_pending"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
            )}>
              {report.status === "all_complete" ? "Done" : report.status === "has_pending" ? "Pending" : "Idle"}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{report.message}</p>

          {report.totalTasks > 0 && (
            <div className="mt-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>{report.completedTasks}/{report.totalTasks} tasks</span>
                <span className="font-semibold text-slate-400">{progress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.05 + 0.15 }}
                  className={cn(
                    "h-full rounded-full",
                    report.status === "all_complete" ? "bg-emerald-400" : "bg-blue-400"
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Team Report Detail Modal ────────────────────────── */

function TeamReportModal({ report, open, onClose }: {
  report: TeamReport | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!report) return null;
  const { Icon, color, bg } = statusIcon(report.status);
  const progress = report.totalTasks > 0
    ? Math.round((report.completedTasks / report.totalTasks) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/8 bg-[#080f1e] p-0 text-white shadow-2xl sm:max-w-lg overflow-hidden">
        {/* Header accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* Header */}
        <div className="border-b border-white/5 p-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/10", bg)}>
              <Icon className={cn("h-6 w-6", color)} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-white">{report.team}</DialogTitle>
              <p className="mt-0.5 text-sm text-slate-400">{report.message}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: report.totalTasks, color: "text-slate-300" },
              { label: "Completed", value: report.completedTasks, color: "text-emerald-400" },
              { label: "Pending", value: report.pendingTasks, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-white/[0.03] p-3 text-center ring-1 ring-white/5">
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          {report.totalTasks > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Overall progress</span>
                <span className="font-semibold text-white">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    report.status === "all_complete"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-blue-500 to-blue-400"
                  )}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <DetailField icon={Tag} label="Status" value={
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                report.status === "all_complete"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : report.status === "has_pending"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {report.status === "all_complete" ? "All Complete" : report.status === "has_pending" ? "Has Pending Tasks" : "Idle"}
              </span>
            } />
            <DetailField icon={CalendarDays} label="Last Updated" value={format(new Date(report.updatedAt), "dd MMM yyyy, hh:mm a")} />
          </div>
        </div>

        <div className="border-t border-white/5 px-6 py-4">
          <Button onClick={onClose} size="sm" className="ml-auto flex rounded-xl bg-white/5 px-5 text-slate-300 ring-1 ring-white/8 hover:bg-white/10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Complaint Row ───────────────────────────────────── */

function ComplaintRow({
  complaint,
  index,
  onClick,
  onConfirm,
  onDecline,
  confirming,
  declining,
}: {
  complaint: Complaint;
  index: number;
  onClick: () => void;
  onConfirm: (e: React.MouseEvent) => void;
  onDecline: (e: React.MouseEvent) => void;
  confirming: boolean;
  declining: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-violet-500/10 bg-[#080f1e]/70 p-4 backdrop-blur-md transition-all duration-200 hover:border-violet-500/30 hover:bg-[#0b1628]/80"
      onClick={onClick}
    >
      {/* Priority left bar */}
      <div className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-2xl", priorityBar(complaint.priority))} />

      <div className="pl-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Globe className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-white">{complaint.title}</p>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", priorityBadgeClass(complaint.priority))}>
                  {complaint.priority}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{complaint.clientName}</p>
            </div>
          </div>
          <code className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
            {complaint.complaintId}
          </code>
        </div>

        {/* Action row */}
        <div
          className="mt-3 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] text-slate-600">
            {complaint.createdAt ? format(new Date(complaint.createdAt), "dd MMM yyyy") : "—"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onConfirm}
              disabled={confirming || declining}
              className="flex h-7 items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Confirm
            </button>
            <button
              onClick={onDecline}
              disabled={confirming || declining}
              className="flex h-7 items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 text-[11px] font-semibold text-rose-400 ring-1 ring-rose-500/20 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              {declining ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Decline
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Complaint Detail Modal ──────────────────────────── */

function ComplaintDetailModal({
  complaint,
  open,
  onClose,
  onConfirm,
  onDecline,
  confirming,
  declining,
}: {
  complaint: Complaint | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  confirming: boolean;
  declining: boolean;
}) {
  if (!complaint) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/8 bg-[#080f1e] p-0 text-white shadow-2xl sm:max-w-lg overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        {/* Header */}
        <div className="border-b border-white/5 p-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Globe className="h-6 w-6 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base font-bold text-white">{complaint.title}</DialogTitle>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", priorityBadgeClass(complaint.priority))}>
                  {complaint.priority}
                </span>
              </div>
              <code className="mt-1 inline-block rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-violet-300">
                {complaint.complaintId}
              </code>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {complaint.description && (
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">Description</p>
              <p className="text-sm leading-relaxed text-slate-300">{complaint.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField icon={User} label="Client" value={complaint.clientName} />
            <DetailField icon={CalendarDays} label="Received" value={
              complaint.createdAt
                ? format(new Date(complaint.createdAt), "dd MMM yyyy, hh:mm a")
                : "—"
            } />
            <DetailField icon={Tag} label="Priority" value={
              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", priorityBadgeClass(complaint.priority))}>
                {complaint.priority}
              </span>
            } />
            <DetailField icon={FileText} label="Complaint ID" value={complaint.complaintId} mono />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-slate-500 hover:text-slate-300"
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onDecline}
              disabled={confirming || declining}
              className="rounded-xl bg-rose-500/10 px-4 text-rose-400 ring-1 ring-rose-500/20 hover:bg-rose-500/20"
            >
              {declining ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
              Decline
            </Button>
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={confirming || declining}
              className="rounded-xl bg-emerald-500/15 px-4 text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25"
            >
              {confirming ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Decline Reason Dialog ───────────────────────────── */

function DeclineDialog({
  complaint,
  open,
  reason,
  onReasonChange,
  onClose,
  onSubmit,
  loading,
}: {
  complaint: Complaint | null;
  open: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/8 bg-[#080f1e] p-0 text-white shadow-2xl sm:max-w-md overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
            <XCircle className="h-5 w-5 text-rose-400" />
          </div>
          <DialogTitle className="text-base font-bold">Decline Complaint</DialogTitle>
          <p className="mt-1 text-sm text-slate-400">
            <code className="mr-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-violet-300">
              {complaint?.complaintId}
            </code>
            will be logged as declined.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Reason for declining (optional)…"
            rows={3}
            className="mt-4 resize-none rounded-xl border-white/8 bg-white/5 text-sm text-white placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/5 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl text-slate-500 hover:text-slate-300">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl bg-rose-500/15 px-5 text-rose-400 ring-1 ring-rose-500/25 hover:bg-rose-500/25"
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirm Decline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Empty State ─────────────────────────────────────── */

function EmptyState({ message, accent = "blue" }: { message: string; accent?: "blue" | "violet" }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 text-center",
      accent === "violet" ? "border-violet-500/15" : "border-blue-500/15"
    )}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
        <Bell className="h-5 w-5 text-slate-600" />
      </div>
      <p className="max-w-[22ch] text-xs leading-relaxed text-slate-600">{message}</p>
    </div>
  );
}

/* ─── Section Shell ───────────────────────────────────── */

function SectionShell({
  title,
  subtitle,
  count,
  countClass,
  accent,
  search,
  onSearch,
  teamFilter,
  onTeamFilter,
  showTeamFilter,
  children,
}: {
  title: string;
  subtitle: string;
  count?: number;
  countClass?: string;
  accent: "blue" | "violet";
  search: string;
  onSearch: (v: string) => void;
  teamFilter?: string;
  onTeamFilter?: (v: string) => void;
  showTeamFilter?: boolean;
  children: React.ReactNode;
}) {
  const borderTop = accent === "violet"
    ? "from-transparent via-violet-500/50 to-transparent"
    : "from-transparent via-blue-500/50 to-transparent";
  const searchFocus = accent === "violet"
    ? "focus:border-violet-500/40"
    : "focus:border-blue-500/40";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#050c18]/60 backdrop-blur-xl">
      {/* Top accent */}
      <div className={cn("h-px w-full bg-gradient-to-r", borderTop)} />

      {/* Section header */}
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">{title}</h2>
              {!!count && count > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", countClass)}>
                  {count}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex items-center gap-2">
          {showTeamFilter && teamFilter !== undefined && onTeamFilter && (
            <Select value={teamFilter} onValueChange={onTeamFilter}>
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg border-white/8 bg-white/[0.03] text-xs text-slate-400 hover:border-white/15">
                <SlidersHorizontal className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Teams">All Teams</SelectItem>
                <TeamSelectItems />
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search…"
              className={cn("h-8 w-full rounded-lg border-white/8 bg-white/[0.03] pl-8 text-xs text-white placeholder:text-slate-600 hover:border-white/15", searchFocus)}
            />
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {children}
      </div>
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────── */

function AlertsSkeleton() {
  return (
    <div className="flex h-[calc(100vh-160px)] gap-5">
      {[1, 2].map((col) => (
        <div key={col} className="flex flex-1 flex-col gap-3 rounded-2xl border border-white/5 bg-[#050c18]/60 p-4">
          <Skeleton className="h-20 rounded-xl bg-white/5" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────── */

export function AlertsPage({ role = "admin" }: { role?: "admin" | "team" }) {
  const isAdmin = role === "admin";

  // Left panel state
  const [teamSearch, setTeamSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("All Teams");

  // Right panel state
  const [complaintSearch, setComplaintSearch] = useState("");

  // Detail modals
  const [selectedReport, setSelectedReport] = useState<TeamReport | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);

  // Decline modal (separate)
  const [declineTarget, setDeclineTarget] = useState<Complaint | null>(null);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: teamSearch || undefined,
      team: teamFilter !== "All Teams" ? teamFilter : undefined,
    }),
    [teamSearch, teamFilter]
  );

  const { data, isLoading, isError, refetch } = useAlerts(filters);
  const confirmMutation = useConfirmComplaint();
  const declineMutation = useDeclineComplaint();

  const handleConfirm = async (complaint: Complaint) => {
    setActionId(complaint._id);
    try {
      await confirmMutation.mutateAsync(complaint._id);
      setComplaintModalOpen(false);
    } finally {
      setActionId(null);
    }
  };

  const openDecline = (complaint: Complaint) => {
    setDeclineTarget(complaint);
    setDeclineReason("");
    setComplaintModalOpen(false);
    setDeclineModalOpen(true);
  };

  const handleDeclineSubmit = async () => {
    if (!declineTarget) return;
    setActionId(declineTarget._id);
    try {
      await declineMutation.mutateAsync({ id: declineTarget._id, reason: declineReason || undefined });
      setDeclineModalOpen(false);
      setDeclineTarget(null);
      setDeclineReason("");
    } finally {
      setActionId(null);
    }
  };

  // Filter complaints client-side by search
  const filteredComplaints = useMemo(() => {
    const q = complaintSearch.toLowerCase();
    if (!q || !data) return data?.pendingComplaints ?? [];
    return data.pendingComplaints.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.clientName?.toLowerCase().includes(q) ||
        c.complaintId?.toLowerCase().includes(q)
    );
  }, [data, complaintSearch]);

  if (isLoading) {
    return (
      <DashboardShell role={role} title="Alerts" subtitle="Loading…">
        <AlertsSkeleton />
      </DashboardShell>
    );
  }

  if (isError || !data) {
    return (
      <DashboardShell role={role} title="Alerts" subtitle="">
        <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
            <TriangleAlert className="h-6 w-6 text-rose-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Couldn't load alerts</p>
            <p className="text-sm text-slate-500">Check your connection and try again.</p>
          </div>
          <Button
            onClick={() => refetch()}
            size="sm"
            className="rounded-xl bg-blue-500/15 px-5 text-blue-400 ring-1 ring-blue-500/25 hover:bg-blue-500/25"
          >
            Retry
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="Alerts"
      subtitle="Live overview of team tasks and incoming complaints."
    >
      {/* Two-column split — stacks on mobile, side-by-side on lg+ */}
      <div className="flex h-[calc(100vh-160px)] flex-col gap-4 lg:flex-row">

        {/* ── LEFT: Team Reports ── */}
        <SectionShell
          title="Team Reports"
          subtitle="Task completion status across all teams"
          count={data.counts.teamsWithPending}
          countClass="bg-amber-500/10 text-amber-400"
          accent="blue"
          search={teamSearch}
          onSearch={setTeamSearch}
          teamFilter={teamFilter}
          onTeamFilter={setTeamFilter}
          showTeamFilter={isAdmin}
        >
          {data.teamReports.length === 0 ? (
            <EmptyState message="No team reports match your filters." />
          ) : (
            data.teamReports.map((report, i) => (
              <TeamReportRow
                key={report.team}
                report={report}
                index={i}
                onClick={() => {
                  setSelectedReport(report);
                  setReportModalOpen(true);
                }}
              />
            ))
          )}
        </SectionShell>

        {/* Divider (visible on lg) */}
        <div className="hidden w-px shrink-0 bg-gradient-to-b from-transparent via-white/8 to-transparent lg:block" />

        {/* ── RIGHT: Website Complaints ── */}
        {isAdmin ? (
          <SectionShell
            title="Website Complaints"
            subtitle="Incoming complaints awaiting your review"
            count={data.counts.pendingReview}
            countClass="bg-violet-500/10 text-violet-400"
            accent="violet"
            search={complaintSearch}
            onSearch={setComplaintSearch}
          >
            {filteredComplaints.length === 0 ? (
              <EmptyState message="No pending complaints. New submissions appear here." accent="violet" />
            ) : (
              filteredComplaints.map((complaint, i) => (
                <ComplaintRow
                  key={complaint._id}
                  complaint={complaint}
                  index={i}
                  onClick={() => {
                    setSelectedComplaint(complaint);
                    setComplaintModalOpen(true);
                  }}
                  onConfirm={(e) => {
                    e.stopPropagation();
                    handleConfirm(complaint);
                  }}
                  onDecline={(e) => {
                    e.stopPropagation();
                    openDecline(complaint);
                  }}
                  confirming={actionId === complaint._id && confirmMutation.isPending}
                  declining={actionId === complaint._id && declineMutation.isPending}
                />
              ))
            )}
          </SectionShell>
        ) : (
          /* Team role: show task alerts instead of complaints */
          <SectionShell
            title="My Task Alerts"
            subtitle="Tasks assigned to you"
            count={data.taskAlerts?.length}
            countClass="bg-blue-500/10 text-blue-400"
            accent="blue"
            search={complaintSearch}
            onSearch={setComplaintSearch}
          >
            {(data.taskAlerts ?? []).length === 0 ? (
              <EmptyState message="No new task alerts. Assigned work appears here." />
            ) : (
              (data.taskAlerts ?? []).map((alert, i) => (
                <motion.div
                  key={alert._id}
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="rounded-2xl border border-blue-500/10 bg-[#080f1e]/70 p-4"
                >
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{alert.message}</p>
                  <code className="mt-2 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {alert.taskId}
                  </code>
                </motion.div>
              ))
            )}
          </SectionShell>
        )}
      </div>

      {/* ── Team Report Detail Modal ── */}
      <TeamReportModal
        report={selectedReport}
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      {/* ── Complaint Detail Modal ── */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        open={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        onConfirm={() => selectedComplaint && handleConfirm(selectedComplaint)}
        onDecline={() => selectedComplaint && openDecline(selectedComplaint)}
        confirming={actionId === selectedComplaint?._id && confirmMutation.isPending}
        declining={actionId === selectedComplaint?._id && declineMutation.isPending}
      />

      {/* ── Decline Reason Modal ── */}
      <DeclineDialog
        complaint={declineTarget}
        open={declineModalOpen}
        reason={declineReason}
        onReasonChange={setDeclineReason}
        onClose={() => setDeclineModalOpen(false)}
        onSubmit={handleDeclineSubmit}
        loading={declineMutation.isPending}
      />
    </DashboardShell>
  );
}