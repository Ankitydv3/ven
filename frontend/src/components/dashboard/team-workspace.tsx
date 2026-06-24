"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlayCircle, MessageSquareText, CircleCheckBig, MapPin, CalendarClock,
  CheckCircle2, XCircle, Sparkles, Clock, Users, RefreshCw, Search,
  Filter, AlertTriangle, Award, Zap, Briefcase, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { completeComplaint, startComplaint, updateComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { complaintKeys, useComplaints } from "@/hooks/useComplaints";
import { taskKeys } from "@/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDueDate } from "@/lib/task-constants";
import { useFeedbackPrompt } from "@/components/feedback/FeedbackPromptProvider";
import { feedbackTargetFromComplaint } from "@/lib/feedback-target";

/* ─── Helpers ──────────────────────────────────────────────────── */
function scheduleLabel(item: Complaint) {
  return item.taskScheduleStatus ?? "Not Scheduled";
}

function effectiveStatus(item: Complaint): Complaint["status"] {
  if (item.taskScheduleStatus === "Completed") return "Completed";
  if (item.taskScheduleStatus === "In Progress") return "In Progress";
  if (["Pending", "Overdue"].includes(item.taskScheduleStatus ?? "")) return "Assigned";
  return item.status;
}

function statusConfig(status: Complaint["status"]) {
  switch (status) {
    case "Completed": return {
      label: "Completed", icon: CheckCircle2,
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      glow: "hover:shadow-emerald-500/10",
    };
    case "In Progress": return {
      label: "In Progress", icon: RefreshCw,
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      glow: "hover:shadow-blue-500/10",
    };
    case "Assigned": return {
      label: "Assigned", icon: Briefcase,
      badge: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      glow: "hover:shadow-violet-500/10",
    };
    default: return {
      label: "Pending", icon: AlertTriangle,
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      glow: "hover:shadow-amber-500/10",
    };
  }
}

function priorityBadgeCls(p: Complaint["priority"]) {
  if (p === "High") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  if (p === "Medium") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
}

const PIE_COLORS = ["#6366F1", "#3B82F6", "#10B981"];

const tooltipStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(59,130,246,0.15)",
  background: "rgba(10,15,30,0.92)",
  backdropFilter: "blur(16px)",
  color: "#fff",
  fontSize: "12px",
  boxShadow: "0 20px 60px -10px rgba(0,0,30,0.5)",
};

/* ─── Stat card ────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, delay }: {
  label: string; value: number; icon: React.ElementType; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app p-5 flex items-center gap-4"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}/10 ring-1 ring-current ring-opacity-20`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
        <p className={`font-bold text-2xl leading-none mt-0.5 ${color}`}>{value}</p>
      </div>
    </motion.div>
  );
}

/* ─── Complaint card ────────────────────────────────────────────── */
function ComplaintCard({
  item, index, pending, startingId, completingId,
  onStartWork, onUpdate, onComplete,
}: {
  item: Complaint; index: number; pending: boolean;
  startingId: string | null; completingId: string | null;
  onStartWork: (id: string) => void;
  onUpdate: (item: Complaint) => void;
  onComplete: (item: Complaint) => void;
}) {
  const status = effectiveStatus(item);
  const sc = statusConfig(status);
  const StatusIcon = sc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
    >
      <div className={`
        rounded-2xl border border-slate-200/80 dark:border-white/[0.07]
        bg-white dark:bg-app
        overflow-hidden hover:shadow-xl ${sc.glow} transition-all duration-300
      `}>
        {/* Top band */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.05]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sc.badge}`}>
                  <StatusIcon className={`h-3.5 w-3.5 ${status === "In Progress" ? "animate-spin" : ""}`} />
                  {status}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${priorityBadgeCls(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
              <h3 className="mt-2 font-bold text-slate-800 dark:text-white truncate">{item.complaintId}</h3>
              <p className="text-xs text-slate-400 dark:text-white/40 truncate">{item.clientName}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => onUpdate(item)}
                disabled={status === "Completed"}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onComplete(item)}
                disabled={pending || status === "Completed"}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <CircleCheckBig className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-white/60 line-clamp-2">{item.description}</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/40">
              <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
              <span>
                {scheduleLabel(item)}
                {item.taskScheduleDueDate ? ` · Due ${formatDueDate(item.taskScheduleDueDate)}` : ""}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onStartWork(item._id)}
              disabled={pending || status !== "Assigned"}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-600/25"
            >
              {startingId === item._id
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <PlayCircle className="h-3.5 w-3.5" />}
              Start Work
            </button>
            <button
              onClick={() => onComplete(item)}
              disabled={pending || status === "Completed"}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Complete
            </button>
          </div>

          {/* Completed remarks */}
          {status === "Completed" && (item.completionRemarks || item.resolutionDetails) && (
            <div className="mt-2 space-y-2">
              {item.completionRemarks && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500 mb-0.5">Remarks</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">{item.completionRemarks}</p>
                </div>
              )}
              {item.resolutionDetails && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500 mb-0.5">Resolution</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">{item.resolutionDetails}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
export function TeamWorkspace() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const complaintsQuery = useComplaints({ limit: 50, scope: "reviewed" });
  const [pending, startTransition] = useTransition();
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<"update" | "complete" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [details, setDetails] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { openFeedback } = useFeedbackPrompt();

  const items = useMemo(
    () =>
      (complaintsQuery.data?.items ?? []).filter((item) => {
        const s = effectiveStatus(item);
        return s === "Assigned" || s === "In Progress" || s === "Completed" || Boolean(item.taskId || item.taskScheduleStatus);
      }),
    [complaintsQuery.data?.items]
  );

  const loading = complaintsQuery.isLoading;

  useEffect(() => {
    if (!pathname.includes("/complaints")) return;
    void queryClient.refetchQueries({ queryKey: complaintKeys.list({ limit: 50, scope: "reviewed" }) });
  }, [pathname, queryClient]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    await queryClient.refetchQueries({ queryKey: complaintKeys.all });
    await queryClient.refetchQueries({ queryKey: taskKeys.all });
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchSearch =
      item.complaintId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || effectiveStatus(item) === statusFilter;
    const matchPriority = priorityFilter === "all" || item.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  }), [items, searchTerm, statusFilter, priorityFilter]);

  const sortedItems = useMemo(() => {
    const order: Record<string, number> = { Assigned: 0, "In Progress": 1, Completed: 2 };
    return [...filteredItems].sort((a, b) =>
      (order[effectiveStatus(a)] ?? 9) - (order[effectiveStatus(b)] ?? 9)
    );
  }, [filteredItems]);

  const statuses = ["Assigned", "In Progress", "Completed"];
  const pieData = statuses.map((s) => ({
    name: s, value: filteredItems.filter((i) => effectiveStatus(i) === s).length,
  }));

  const assignedCount = pieData[0].value;
  const inProgressCount = pieData[1].value;
  const completedCount = pieData[2].value;
  const total = filteredItems.length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const stats = [
    { label: "Assigned", value: assignedCount, icon: Briefcase, color: "text-violet-500", delay: 0 },
    { label: "In Progress", value: inProgressCount, icon: Zap, color: "text-blue-500", delay: 0.07 },
    { label: "Completed", value: completedCount, icon: Award, color: "text-emerald-500", delay: 0.14 },
    { label: "Total", value: total, icon: Clock, color: "text-amber-500", delay: 0.21 },
  ];

  const closeModal = () => { setModalMode(null); setActiveComplaint(null); setRemarks(""); setDetails(""); };

  const handleStartWork = (id: string) => {
    startTransition(async () => {
      setStartingId(id);
      try {
        await startComplaint(id);
        toast.success("Work started");
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start work");
      } finally { setStartingId(null); }
    });
  };

  const handleUpdateWork = () => {
    if (!activeComplaint) return;
    startTransition(async () => {
      setUpdatingId(activeComplaint._id);
      try {
        await updateComplaint(activeComplaint._id, { remarks, details });
        toast.success("Update saved");
        closeModal();
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      } finally { setUpdatingId(null); }
    });
  };

  const handleCompleteWork = () => {
    if (!activeComplaint) return;
    const cc = activeComplaint;
    startTransition(async () => {
      setCompletingId(cc._id);
      try {
        await completeComplaint(cc._id, { completionRemarks: remarks, resolutionDetails: details });
        toast.success(`✅ ${cc.complaintId} marked as completed!`, { duration: 5000 });
        closeModal();
        setTimeout(() => openFeedback(feedbackTargetFromComplaint(cc)), 200);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to complete");
      } finally { setCompletingId(null); }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30">
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white text-lg leading-none">Team Workspace</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your assigned tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.07]">
            <Target className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{completionRate}% done</span>
          </div>
          <button
            onClick={() => void refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search complaints…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30 focus-visible:ring-blue-500/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl border-slate-200 dark:border-white/[0.08]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Assigned">Assigned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] rounded-xl border-slate-200 dark:border-white/[0.08]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPriorityFilter("all"); }}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* ── Pie chart ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Distribution</p>
            <h3 className="font-bold text-slate-800 dark:text-white">Complaint Breakdown</h3>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <Users className="h-3.5 w-3.5" /> {total} total
          </span>
        </div>
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                cornerRadius={6}
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle as any} />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(v) => <span style={{ color: "#94A3B8" }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Complaint cards ──────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app py-16 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 mb-3">
            <Sparkles className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-white/70">No tasks yet</h3>
          <p className="text-sm text-slate-400 dark:text-white/30 mt-1">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters"
              : "When admin assigns tasks, they'll appear here"}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {sortedItems.map((item, idx) => (
              <ComplaintCard
                key={item._id}
                item={item}
                index={idx}
                pending={pending}
                startingId={startingId}
                completingId={completingId}
                onStartWork={handleStartWork}
                onUpdate={(i) => { setActiveComplaint(i); setModalMode("update"); setRemarks(""); setDetails(""); }}
                onComplete={(i) => { setActiveComplaint(i); setModalMode("complete"); setRemarks(""); setDetails(""); }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Update Dialog ────────────────────────────────── */}
      <Dialog open={modalMode === "update"} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-app border-slate-200 dark:border-white/[0.08] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquareText className="h-4 w-4 text-blue-500" />
              </div>
              <DialogTitle className="font-bold text-slate-800 dark:text-white">Update Progress</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 dark:text-white/40">
              Record work done on this complaint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">complaint id</p>
              <p className="font-bold text-slate-800 dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Work remarks (required)"
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-blue-500/40"
            />
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-blue-500/40"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl border-slate-200 dark:border-white/[0.08]">Cancel</Button>
            <Button
              onClick={handleUpdateWork}
              disabled={pending || !remarks.trim()}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
            >
              {pending && updatingId === activeComplaint?._id && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complete Dialog ───────────────────────────────── */}
      <Dialog open={modalMode === "complete"} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-app border-slate-200 dark:border-white/[0.08] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Award className="h-4 w-4 text-emerald-500" />
              </div>
              <DialogTitle className="font-bold text-slate-800 dark:text-white">Complete Complaint</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 dark:text-white/40">
              Mark this complaint as resolved with final details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">complaint id</p>
              <p className="font-bold text-slate-800 dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Completion remarks (required)"
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-emerald-500/40"
            />
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Resolution details (required)"
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-emerald-500/40"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl border-slate-200 dark:border-white/[0.08]">Cancel</Button>
            <Button
              onClick={handleCompleteWork}
              disabled={pending || !remarks.trim() || !details.trim()}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
            >
              {pending && completingId === activeComplaint?._id
                ? <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                : <CircleCheckBig className="h-4 w-4 mr-2" />}
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}