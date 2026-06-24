"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Filter, ArrowUpRight, RefreshCw, Ban,
  Shield, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { assignComplaint, fetchComplaints } from "@/services/complaints";
import { fetchAssignableUsers } from "@/services/users";
import { getApiErrorMessage } from "@/lib/api";
import { complaintStatuses } from "@/lib/constants";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { readUser } from "@/lib/storage";
import { canManageComplaints } from "@/lib/permissions";
import { statusBadgeVariant as taskStatusBadgeVariant, formatDueDate, blocksTaskAssignment } from "@/lib/task-constants";

/* ─── Helpers ──────────────────────────────────────────────────── */
function statusConfig(status: Complaint["status"]) {
  const map: Record<string, { label: string; cls: string }> = {
    Completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    "In Progress": { label: "In Progress", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    Assigned: { label: "Assigned", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    Declined: { label: "Declined", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    "Pending Review": { label: "Pending Review", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/[0.06] dark:text-white/60" };
}

function priorityConfig(priority: Complaint["priority"]) {
  if (priority === "High") return { dot: "bg-rose-500", cls: "text-rose-500" };
  if (priority === "Medium") return { dot: "bg-amber-500", cls: "text-amber-500" };
  return { dot: "bg-emerald-500", cls: "text-emerald-500" };
}

function scheduleLabel(item: Complaint) {
  return item.taskScheduleStatus ?? "Not Scheduled";
}

function assignLockReason(c: Complaint) {
  if (c.status === "Completed") return "Cannot assign completed complaints";
  if (c.status === "In Progress") return "Cannot reassign a complaint in progress";
  if (blocksTaskAssignment(c.taskScheduleStatus)) return `Linked task is ${c.taskScheduleStatus}. Cancel or reopen first.`;
  return "";
}

/* ─── Skeleton ─────────────────────────────────────────────────── */
function RowSkeleton() {
  return (
    <tr>
      <td colSpan={9} className="px-4 py-2">
        <Skeleton className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
      </td>
    </tr>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
export function ComplaintsManager() {
  const sessionUser = readUser();
  const canManage = canManageComplaints(sessionUser?.role);
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 8;
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pending, startTransition] = useTransition();

  const { data: assignableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: Boolean(assignTarget),
  });

  useEffect(() => {
    if (!assignTarget) return;
    if (assignTarget.assignedUserId && assignableUsers.some((u) => u._id === assignTarget.assignedUserId)) {
      setSelectedUserId(assignTarget.assignedUserId);
    } else if (assignableUsers.length > 0) {
      setSelectedUserId(assignableUsers[0]._id);
    } else {
      setSelectedUserId("");
    }
  }, [assignTarget, assignableUsers]);

  const selectedUser = assignableUsers.find((u) => u._id === selectedUserId);

  const load = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { limit, page, scope: "reviewed" };
      if (search) filters.q = search;
      if (status && status !== "All") filters.status = status;
      const res = await fetchComplaints(filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page, status]);

  const canAssign = (c: Complaint) =>
    canManage &&
    !["Completed", "In Progress", "Declined", "Pending Review"].includes(c.status) &&
    !blocksTaskAssignment(c.taskScheduleStatus);

  const handleAssign = () => {
    if (!assignTarget) return;
    if (!canAssign(assignTarget)) {
      toast.error(assignLockReason(assignTarget));
      return;
    }
    startTransition(async () => {
      try {
        if (!selectedUserId) { toast.error("Please select a user"); return; }
        const isReassign = Boolean(assignTarget.assignedUserId || assignTarget.assignedTeam);
        await assignComplaint(assignTarget._id, selectedUserId);
        toast.success(isReassign
          ? `Reassigned to ${selectedUser?.name ?? "user"}`
          : `Assigned to ${selectedUser?.name ?? "user"}`
        );
        setAssignTarget(null);
        setSelectedUserId("");
        await load();
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Assignment failed"));
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* ── Header & filters ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app overflow-hidden"
      >
        <div className="border-b border-slate-100 dark:border-white/[0.06] px-5 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30">
            <Shield className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Complaints</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-base leading-tight">Complaints Manager</h2>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), void load())}
                placeholder="Search by ID, client name, or mobile…"
                className="pl-9 rounded-xl border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30 focus-visible:ring-blue-500/40"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-app py-2 pl-9 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {complaintStatuses.map((v) => (
                  <option key={v} value={v} className="bg-app text-white">{v}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => { setPage(1); void load(); }}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-600/25"
            >
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Desktop table ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="hidden md:block rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {["Complaint ID", "Client", "Priority", "Location", "Status", "Schedule", "Assigned to", "Created", "Actions"]
                  .map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                  : items.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                            <Search className="h-5 w-5 text-slate-300 dark:text-white/20" />
                          </div>
                          <p className="font-semibold text-slate-600 dark:text-white/60">No complaints found</p>
                          <p className="text-xs text-slate-400 dark:text-white/30">Try adjusting your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : items.map((item, idx) => {
                      const sc = statusConfig(item.status);
                      const pc = priorityConfig(item.priority);
                      const canA = canAssign(item);
                      const isCompleted = item.status === "Completed";

                      return (
                        <motion.tr
                          key={item._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`border-b border-slate-100 dark:border-white/[0.05] last:border-0 transition-colors ${
                            isCompleted ? "opacity-60" : "hover:bg-blue-50/50 dark:hover:bg-blue-500/[0.04]"
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                            {item.complaintId}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-white/70">{item.clientName}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${pc.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} />
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-white/50 hidden lg:table-cell truncate max-w-[140px]">
                            {item.location}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-slate-500 dark:text-white/50 whitespace-nowrap">
                              {scheduleLabel(item)}
                              {item.taskScheduleDueDate && (
                                <span className="block text-[10px] text-slate-400 dark:text-white/30 mt-0.5">
                                  Due {formatDueDate(item.taskScheduleDueDate)}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-white/50 hidden xl:table-cell">
                            {item.assignedUserName
                              ? `${item.assignedUserName}${item.assignedTeam ? ` · ${item.assignedTeam}` : ""}`
                              : item.assignedTeam ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 dark:text-white/30 hidden xl:table-cell whitespace-nowrap">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <button
                                      disabled={!canA}
                                      onClick={() => { if (canA) { setAssignTarget(item); setSelectedUserId(item.assignedUserId ?? ""); } }}
                                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                                        canA
                                          ? "border-blue-500/30 bg-blue-500/[0.07] text-blue-600 dark:text-blue-400 hover:bg-blue-500/15"
                                          : "border-slate-200 dark:border-white/[0.06] text-slate-400 dark:text-white/30 cursor-not-allowed opacity-50"
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <><Ban className="h-3.5 w-3.5" /> Locked</>
                                      ) : item.assignedTeam ? (
                                        <><RefreshCw className="h-3.5 w-3.5" /> Reassign</>
                                      ) : (
                                        <><ArrowUpRight className="h-3.5 w-3.5" /> Assign</>
                                      )}
                                    </button>
                                  </span>
                                </TooltipTrigger>
                                {!canA && assignLockReason(item) && (
                                  <TooltipContent><p>{assignLockReason(item)}</p></TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        </motion.tr>
                      );
                    })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Mobile cards ─────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
          : items.map((item, idx) => {
              const sc = statusConfig(item.status);
              const pc = priorityConfig(item.priority);
              const canA = canAssign(item);

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-app p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{item.complaintId}</p>
                      <p className="text-xs text-slate-400 dark:text-white/40">{item.clientName}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-white/50">
                    <span className={`flex items-center gap-1 ${pc.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} /> {item.priority}
                    </span>
                    <span>{item.location}</span>
                  </div>
                  <button
                    disabled={!canA}
                    onClick={() => { if (canA) { setAssignTarget(item); setSelectedUserId(item.assignedUserId ?? ""); } }}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                      canA
                        ? "border-blue-500/30 bg-blue-500/[0.07] text-blue-600 dark:text-blue-400 hover:bg-blue-500/15"
                        : "border-slate-200 dark:border-white/[0.06] text-slate-300 dark:text-white/20 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {item.status === "Completed" ? <><Ban className="h-3.5 w-3.5" /> Locked</>
                      : item.assignedTeam ? <><RefreshCw className="h-3.5 w-3.5" /> Reassign</>
                      : <><ArrowUpRight className="h-3.5 w-3.5" /> Assign</>}
                  </button>
                </motion.div>
              );
            })}
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <p className="text-sm text-slate-500 dark:text-white/40">
            Page <span className="font-bold text-slate-800 dark:text-white">{page}</span> of{" "}
            <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Assign Dialog ─────────────────────────────────── */}
      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => { if (!open) { setAssignTarget(null); setSelectedUserId(""); } }}
      >
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-app border-slate-200 dark:border-white/[0.08] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-800 dark:text-white">
              {assignTarget?.assignedUserId || assignTarget?.assignedTeam ? "Reassign complaint" : "Assign complaint"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 dark:text-white/40 text-sm">
              {assignTarget?.assignedUserName || assignTarget?.assignedTeam
                ? `Currently assigned to ${assignTarget.assignedUserName ?? assignTarget.assignedTeam}.`
                : "Select a team member to handle this complaint."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Complaint info */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">complaint id</p>
              <p className="font-bold text-slate-800 dark:text-white text-lg">{assignTarget?.complaintId}</p>
              <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">{assignTarget?.title}</p>
            </div>

            {/* Completed warning */}
            {assignTarget?.status === "Completed" && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 flex items-start gap-2">
                <Ban className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Complaint completed</p>
                  <p className="text-xs text-rose-400/70 mt-0.5">Completed complaints cannot be reassigned.</p>
                </div>
              </div>
            )}

            {/* Currently assigned */}
            {(assignTarget?.assignedUserName || assignTarget?.assignedTeam) && assignTarget?.status !== "Completed" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Currently assigned</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {assignTarget.assignedUserName
                    ? `${assignTarget.assignedUserName} · ${assignTarget.assignedTeam ?? "No team"}`
                    : `Team: ${assignTarget.assignedTeam}`}
                </p>
              </div>
            )}

            {/* User selector */}
            {assignTarget?.status !== "Completed" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
                  {assignTarget?.assignedUserId ? "Select new user" : "Select user"}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={usersLoading || assignableUsers.length === 0}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {usersLoading ? (
                    <option>Loading users…</option>
                  ) : assignableUsers.length === 0 ? (
                    <option>No users available</option>
                  ) : (
                    assignableUsers.map((u) => (
                      <option key={u._id} value={u._id} className="bg-app text-white">
                        {u.name}{assignTarget?.assignedUserId === u._id ? " (Current)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Preview */}
            {selectedUser && selectedUserId !== assignTarget?.assignedUserId && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Assigning to <span className="font-bold">{selectedUser.name}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignTarget(null)}
              className="rounded-xl border-slate-200 dark:border-white/[0.08]"
            >
              Cancel
            </Button>
            {assignTarget?.status !== "Completed" && (
              <Button
                onClick={handleAssign}
                disabled={pending || !selectedUserId || usersLoading || assignableUsers.length === 0 || selectedUserId === assignTarget?.assignedUserId}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {assignTarget?.assignedTeam ? "Reassign" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}