"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  Users,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useComplaints, useComplaintStats } from "@/hooks/useComplaints";
import { useTeams } from "@/hooks/use-teams";
import { useSession } from "@/hooks/use-session";
import { assignComplaint } from "@/services/complaints";
import { fetchAssignableUsers } from "@/services/users";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";
import { canManageComplaints } from "@/lib/permissions";
import { blocksTaskAssignment } from "@/lib/task-constants";
import type { Complaint } from "@/lib/types";
import {
  getComplaintWorkflowStage,
  workflowDisplayStatuses,
  workflowStageBadgeClass,
  type WorkflowStage,
} from "@/lib/workflow";
import { cn } from "@/lib/utils";

const DISPLAY_STATUSES = workflowDisplayStatuses;

type DisplayStatusFilter = (typeof DISPLAY_STATUSES)[number];

type WorkflowStatus = WorkflowStage | "Delayed";

function getDefaultDateRange() {
  const now = new Date();
  return {
    startDate: format(startOfMonth(now), "yyyy-MM-dd"),
    endDate: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

function formatDateRangeLabel(startDate: string, endDate: string) {
  return `${format(new Date(startDate), "dd MMM yyyy")} – ${format(new Date(endDate), "dd MMM yyyy")}`;
}

function isDelayIssue(complaint: Complaint) {
  const text = `${complaint.title} ${complaint.description}`.toLowerCase();
  return /delay|delayed|late|overdue/.test(text);
}

function getDisplayStatus(complaint: Complaint): WorkflowStatus {
  if (isDelayIssue(complaint)) return "Delayed";
  return getComplaintWorkflowStage(complaint);
}

function statusBadgeClass(status: WorkflowStatus) {
  if (status === "Delayed") return "bg-rose-500/15 text-rose-400";
  return workflowStageBadgeClass[status as WorkflowStage] ?? "bg-slate-500/15 text-slate-400";
}

function formatComplaintDate(value?: string) {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy");
}

function buildPageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

function canAssignComplaint(complaint: Complaint) {
  return (
    !["Pending Review", "Declined", "Completed", "In Progress"].includes(complaint.status) &&
    !blocksTaskAssignment(complaint.taskScheduleStatus)
  );
}

function assignLockReason(complaint: Complaint) {
  if (complaint.status === "Pending Review") {
    return "Confirm this complaint from Alerts before assigning";
  }
  if (complaint.status === "Declined") {
    return "Declined complaints cannot be assigned";
  }
  if (complaint.status === "Completed") {
    return "Completed complaints cannot be reassigned";
  }
  if (complaint.status === "In Progress") {
    return "Cannot reassign a complaint that is in progress";
  }
  if (blocksTaskAssignment(complaint.taskScheduleStatus)) {
    return `Linked task is ${complaint.taskScheduleStatus}. Cancel or reopen first.`;
  }
  return "";
}

const TEAM_BADGE_COLORS = [
  "border-blue-500/40 text-blue-300",
  "border-purple-500/40 text-purple-300",
  "border-amber-500/40 text-amber-300",
  "border-emerald-500/40 text-emerald-300",
  "border-rose-500/40 text-rose-300",
];

function teamBadgeClass(teamName: string) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i += 1) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TEAM_BADGE_COLORS[Math.abs(hash) % TEAM_BADGE_COLORS.length];
}

export function ComplaintsPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const queryClient = useQueryClient();
  const sessionUser = readUser();
  const canManage = canManageComplaints(sessionUser?.role);
  const { data: teams = [] } = useTeams();
  const teamOptions = useMemo(() => ["All Teams", ...teams.map((t) => t.teamName)], [teams]);

  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [dateRange, setDateRange] = useState(defaults);
  const [draftDateRange, setDraftDateRange] = useState(defaults);
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [displayStatus, setDisplayStatus] = useState<DisplayStatusFilter>("All");
  const [teamFilter, setTeamFilter] = useState("All Teams");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pending, startTransition] = useTransition();
  const limit = 10;

  const { data: assignableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: Boolean(assignTarget),
  });

  useEffect(() => {
    if (!assignTarget) return;
    if (
      assignTarget.assignedUserId &&
      assignableUsers.some((u) => u._id === assignTarget.assignedUserId)
    ) {
      setSelectedUserId(assignTarget.assignedUserId);
    } else if (assignableUsers.length > 0) {
      setSelectedUserId(assignableUsers[0]._id);
    } else {
      setSelectedUserId("");
    }
  }, [assignTarget, assignableUsers]);

  const selectedUser = assignableUsers.find((u) => u._id === selectedUserId);

  const listParams = useMemo(
    () => ({
      q: appliedSearch || undefined,
      displayStatus: displayStatus !== "All" ? displayStatus : undefined,
      team: teamFilter !== "All Teams" ? teamFilter : undefined,
      ...(dateFilterActive
        ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
        : {}),
      page,
      limit,
      scope: "reviewed" as const,
    }),
    [appliedSearch, displayStatus, teamFilter, dateFilterActive, dateRange, page, limit]
  );

  const statsParams = useMemo(
    () => ({
      ...(dateFilterActive
        ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
        : {}),
      team: teamFilter !== "All Teams" ? teamFilter : undefined,
    }),
    [dateFilterActive, dateRange, teamFilter]
  );

  const { data, isLoading, refetch } = useComplaints(listParams);
  const { data: stats, isLoading: statsLoading } = useComplaintStats(statsParams);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageNumbers = buildPageNumbers(page, totalPages);
  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, total);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearch) count++;
    if (displayStatus !== "All") count++;
    if (teamFilter !== "All Teams") count++;
    return count;
  }, [appliedSearch, displayStatus, teamFilter]);

  const dateLabel = dateFilterActive
    ? formatDateRangeLabel(dateRange.startDate, dateRange.endDate)
    : "All dates";

  const kpiCards = useMemo(
    () => [
      {
        label: "Total",
        value: stats?.total ?? 0,
        icon: ClipboardList,
        color: "blue" as const,
      },
      {
        label: "Resolved",
        value: stats?.resolved ?? 0,
        icon: CheckCircle2,
        color: "green" as const,
      },
      {
        label: "Unresolved",
        value: stats?.unresolved ?? 0,
        icon: AlertTriangle,
        color: "orange" as const,
      },
      {
        label: "Issues",
        value: stats?.issuePending ?? 0,
        icon: Clock,
        color: "red" as const,
      },
    ],
    [stats]
  );

  const applyDateRange = () => {
    setDateRange(draftDateRange);
    setDateFilterActive(true);
    setPage(1);
    setDateMenuOpen(false);
  };

  const clearDateRange = () => {
    setDateFilterActive(false);
    setDraftDateRange(defaults);
    setDateRange(defaults);
    setPage(1);
    setDateMenuOpen(false);
  };

  const handleSearch = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleAssign = () => {
    if (!assignTarget || !selectedUserId) return;
    if (!canAssignComplaint(assignTarget)) {
      toast.error(assignLockReason(assignTarget));
      return;
    }

    startTransition(async () => {
      try {
        const isReassign = Boolean(assignTarget.assignedUserId || assignTarget.assignedTeam);
        await assignComplaint(assignTarget._id, selectedUserId);
        toast.success(
          isReassign
            ? `Reassigned to ${selectedUser?.name ?? "user"}`
            : `Assigned to ${selectedUser?.name ?? "user"}`
        );
        setAssignTarget(null);
        setSelectedUserId("");
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
        await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Assignment failed"));
      }
    });
  };

  if (!ready) return null;

  return (
    <DashboardShell
      role={role}
      title="Complaints"
      subtitle="Manage and assign complaints to service teams."
    >
      <div className="mx-auto w-full max-w-[1680px] space-y-6">
        {/* ── Compact KPI + Date Range + New Complaint ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {/* KPI cards — compact horizontal row */}
          <div className="flex flex-wrap w-full items-stretch gap-2">
  {statsLoading
    ? Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="flex-1 min-w-[100px] h-[62px] rounded-xl bg-white/[0.04]" />
      ))
    : kpiCards.map((kpi, i) => {
        const colorMap = {
          blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
          green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
          orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20",
          red: "from-rose-500/20 to-rose-600/10 border-rose-500/20",
        };
        const iconColorMap = {
          blue: "text-blue-400",
          green: "text-emerald-400",
          orange: "text-orange-400",
          red: "text-rose-400",
        };
        return (
          <div
            key={kpi.label}
            className={cn(
              "flex-1 min-w-[100px] flex items-center gap-3 rounded-xl border bg-gradient-to-br px-4 py-3",
              colorMap[kpi.color]
            )}
          >
            <div className={cn("rounded-lg p-1.5", iconColorMap[kpi.color])}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {kpi.label}
              </p>
              <p className="text-lg font-semibold text-white leading-none">
                {kpi.value}
              </p>
            </div>
          </div>
        );
      })}
</div>

          {/* Date range + New Complaint */}
          
        </motion.div>

        {/* Filters */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search complaints..."
                className="h-10 rounded-xl border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/30"
              />
            </div>

            <select
              value={displayStatus}
              onChange={(e) => {
                setDisplayStatus(e.target.value as DisplayStatusFilter);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/10 bg-app px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {DISPLAY_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-app text-white">
                  {s === "All" ? "All Status" : s}
                </option>
              ))}
            </select>

            <select
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-white/10 bg-app px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {teamOptions.map((team) => (
                <option key={team} value={team} className="bg-app text-white">
                  {team}
                </option>
              ))}
            </select>
{/* //Date */}
            <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu open={dateMenuOpen} onOpenChange={setDateMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
                  {dateLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 rounded-2xl border border-white/10 bg-app p-4 text-white"
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Start date</Label>
                    <Input
                      type="date"
                      value={draftDateRange.startDate}
                      onChange={(e) =>
                        setDraftDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">End date</Label>
                    <Input
                      type="date"
                      value={draftDateRange.endDate}
                      onChange={(e) =>
                        setDraftDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                  <Button
                    onClick={applyDateRange}
                    className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Apply range
                  </Button>
                  {dateFilterActive && (
                    <Button
                      variant="outline"
                      onClick={clearDateRange}
                      className="w-full rounded-xl border-white/10 text-white hover:bg-white/10"
                    >
                      Show all dates
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {canManage && (
              <Button
                onClick={() => setShowNewComplaint(true)}
                className="h-9 rounded-xl bg-blue-600 px-4 text-xs text-white shadow-sm hover:bg-blue-500"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Complaint
              </Button>
            )}
          </div>

            
          </div>

          {showFilters && activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-400">Active filters:</span>
              {appliedSearch && (
                <Badge className="bg-white/10 text-white">Search: {appliedSearch}</Badge>
              )}
              {displayStatus !== "All" && (
                <Badge className="bg-white/10 text-white">Status: {displayStatus}</Badge>
              )}
              {teamFilter !== "All Teams" && (
                <Badge className="bg-white/10 text-white">Team: {teamFilter}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] md:block">
          <Table>
            <TableElement>
              <THead>
                <tr className="border-b border-white/10">
                  <TH className="w-[5%]">S. No.</TH>
                  <TH className="w-[10%]">Complaint ID</TH>
                  <TH className="w-[12%]">Customer Name</TH>
                  <TH className="w-[18%]">Address</TH>
                  <TH className="w-[10%]">Paid / Unpaid Service</TH>
                  <TH className="w-[16%]">Complaint Comment</TH>
                  <TH className="w-[10%]">Assigned Team</TH>
                  <TH className="w-[10%]">Status</TH>
                  <TH className="w-[8%]">Date</TH>
                  {canManage && <TH className="w-[8%] text-right">Actions</TH>}
                </tr>
              </THead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TR key={i}>
                        <TD colSpan={canManage ? 10 : 9}>
                          <Skeleton className="h-10 rounded-lg bg-white/[0.04]" />
                        </TD>
                      </TR>
                    ))
                  : items.length === 0
                    ? (
                        <TR>
                          <TD colSpan={canManage ? 10 : 9}>
                            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                              <p className="font-medium text-white">No complaints found</p>
                              <p className="text-sm text-slate-400">
                                Try adjusting your search or filters.
                              </p>
                            </div>
                          </TD>
                        </TR>
                      )
                    : items.map((complaint, index) => {
                        const rowStatus = getDisplayStatus(complaint);
                        const serial = (page - 1) * limit + index + 1;
                        const isPaid =
                          complaint.paymentStatus === "Paid" ||
                          complaint.paymentStatus === "Partially Paid";
                        const canAssign = canManage && canAssignComplaint(complaint);

                        return (
                          <TR key={complaint._id} className="border-b border-white/[0.06] last:border-0">
                            <TD className="text-slate-400">{serial}</TD>
                            <TD>
                              <span className="font-medium text-blue-400">{complaint.complaintId}</span>
                            </TD>
                            <TD className="text-white/90">{complaint.clientName}</TD>
                            <TD className="text-slate-400">{complaint.location}</TD>
                            <TD>
                              <Badge
                                className={cn(
                                  "rounded-full border-0 font-normal",
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-rose-500/15 text-rose-400"
                                )}
                              >
                                {isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            </TD>
                            <TD className="max-w-[220px] truncate text-slate-400">
                              {complaint.description || complaint.title}
                            </TD>
                            <TD>
                              {complaint.assignedTeam ? (
                                <span
                                  className={cn(
                                    "inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium",
                                    teamBadgeClass(complaint.assignedTeam)
                                  )}
                                >
                                  {complaint.assignedTeam}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </TD>
                            <TD>
                              <Badge className={cn("rounded-full border-0 font-normal", statusBadgeClass(rowStatus))}>
                                {rowStatus}
                              </Badge>
                            </TD>
                            <TD className="whitespace-nowrap text-slate-400">
                              {formatComplaintDate(complaint.createdAt)}
                            </TD>
                            {canManage && (
                              <TD className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canAssign}
                                  title={!canAssign ? assignLockReason(complaint) : undefined}
                                  onClick={() => canAssign && setAssignTarget(complaint)}
                                  className="h-8 rounded-lg border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 disabled:opacity-40"
                                >
                                  {complaint.assignedTeam ? (
                                    <>
                                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                      Reassign
                                    </>
                                  ) : (
                                    <>
                                      <Users className="mr-1.5 h-3.5 w-3.5" />
                                      Assign
                                    </>
                                  )}
                                </Button>
                              </TD>
                            )}
                          </TR>
                        );
                      })}
              </tbody>
            </TableElement>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl bg-white/[0.04]" />
              ))
            : items.map((complaint) => {
                const rowStatus = getDisplayStatus(complaint);
                const isPaid =
                  complaint.paymentStatus === "Paid" ||
                  complaint.paymentStatus === "Partially Paid";
                const canAssign = canManage && canAssignComplaint(complaint);

                return (
                  <div
                    key={complaint._id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-blue-400">{complaint.complaintId}</p>
                        <p className="font-semibold text-white">{complaint.clientName}</p>
                      </div>
                      <Badge className={cn("rounded-full border-0", statusBadgeClass(rowStatus))}>
                        {rowStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{complaint.location}</p>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {complaint.description || complaint.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        className={cn(
                          "rounded-full border-0",
                          isPaid ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                        )}
                      >
                        {isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                      {complaint.assignedTeam ? (
                        <span
                          className={cn(
                            "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium",
                            teamBadgeClass(complaint.assignedTeam)
                          )}
                        >
                          {complaint.assignedTeam}
                        </span>
                      ) : (
                        <span className="text-slate-500">No team assigned</span>
                      )}
                      <span className="text-slate-500">
                        {formatComplaintDate(complaint.createdAt)}
                      </span>
                    </div>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canAssign}
                        onClick={() => canAssign && setAssignTarget(complaint)}
                        className="w-full rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                      >
                        {complaint.assignedTeam ? (
                          <>
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            Reassign Team
                          </>
                        ) : (
                          <>
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Assign
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing{" "}
            <span className="font-medium text-white">{showingFrom}</span> to{" "}
            <span className="font-medium text-white">{showingTo}</span> of{" "}
            <span className="font-medium text-white">{total}</span> complaints
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 w-9 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {pageNumbers.map((pageNum, idx) => {
                const prev = pageNumbers[idx - 1];
                const showEllipsis = prev !== undefined && pageNum - prev > 1;
                return (
                  <span key={pageNum} className="flex items-center gap-1.5">
                    {showEllipsis && <span className="px-1 text-slate-500">…</span>}
                    <button
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
                        pageNum === page
                          ? "bg-blue-600 text-white"
                          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {pageNum}
                    </button>
                  </span>
                );
              })}

              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 w-9 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Assign user dialog */}
      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
            setSelectedUserId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] border-white/10 bg-app text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {assignTarget?.assignedUserId || assignTarget?.assignedTeam
                ? "Reassign complaint"
                : "Assign complaint"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a team member to handle this complaint. A task will be created in their My Tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Complaint ID
              </p>
              <p className="font-semibold text-white">{assignTarget?.complaintId}</p>
              <p className="mt-0.5 text-xs text-slate-400">{assignTarget?.clientName}</p>
            </div>

            {(assignTarget?.assignedUserName || assignTarget?.assignedTeam) && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-medium text-amber-400">Currently assigned</p>
                <p className="font-semibold text-white">
                  {assignTarget.assignedUserName
                    ? `${assignTarget.assignedUserName} · ${assignTarget.assignedTeam ?? "No team"}`
                    : assignTarget.assignedTeam}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                {assignTarget?.assignedUserId ? "Select new assignee" : "Select team member"}
              </Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={usersLoading || assignableUsers.length === 0}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {usersLoading ? (
                  <option className="bg-app">Loading users…</option>
                ) : assignableUsers.length === 0 ? (
                  <option className="bg-app">No team users available</option>
                ) : (
                  assignableUsers.map((user) => (
                    <option key={user._id} value={user._id} className="bg-app text-white">
                      {user.name} · {user.teamName ?? user.team ?? "No team"}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignTarget(null)}
              className="rounded-xl border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                pending ||
                !selectedUserId ||
                assignableUsers.length === 0 ||
                selectedUserId === assignTarget?.assignedUserId
              }
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-500"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {assignTarget?.assignedUserId ? "Reassign" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Complaint dialog */}
      <Dialog open={showNewComplaint} onOpenChange={setShowNewComplaint}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] border-white/10 bg-app text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">New Complaint</DialogTitle>
            <DialogDescription className="text-slate-400">
              Register a new complaint for review and team assignment.
            </DialogDescription>
          </DialogHeader>
          <ComplaintRegistrationForm
            onSuccess={() => {
              setShowNewComplaint(false);
              void refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}