  "use client";

  import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
  import { useSearchParams, useRouter } from "next/navigation";
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
    Play,
    Download,
    Eye,
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
  import { Textarea } from "@/components/ui/textarea";
  import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";
  import { getComplaintDetailsPath } from "@/lib/record-navigation";
  import { ACTIVE_COMPLAINT_SCOPE } from "@/lib/active-complaints";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import { useComplaints, useComplaintStats } from "@/hooks/useComplaints";
  import { useTeams } from "@/hooks/use-teams";
  import { useSession } from "@/hooks/use-session";
  import { assignComplaint, fetchComplaints, startComplaint, scheduleRevisit } from "@/services/complaints";
  import { fetchAssignableUsers } from "@/services/users";
  import * as XLSX from "xlsx";
  import { getApiErrorMessage } from "@/lib/api";
  import { readUser } from "@/lib/storage";
  import { canManageComplaints } from "@/lib/permissions";
  import { blocksComplaintReassignment } from "@/lib/task-constants";
  import type { Complaint } from "@/lib/types";
  import {
    getComplaintWorkflowStage,
    workflowDisplayStatuses,
    workflowStageBadgeClass,
    type WorkflowStage,
  } from "@/lib/workflow";
  import { cn } from "@/lib/utils";
import { getMaterialPaymentStatusBadgeClass } from "@/services/material-requests";
  import { modalViewportClass, summaryListCardClass, wrapTextClass } from "@/lib/responsive-text";
  import { ComplaintSummaryText } from "@/components/shared/complaint-summary-text";

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

  function formatComplaintDate(date: string | undefined) {
    if (!date) return "—";
    return format(new Date(date), "dd MMM yyyy");
  }

  function formatComplaintAge(createdAt: string) {
    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    // Restore now for diffDays logic if needed, but diffDays is already calculated.

    if (isToday) {
      return format(date, "hh:mm a");
    }
    if (diffDays === 1) {
      return "1 Day";
    }
    if (diffDays > 1) {
      return `+${diffDays} Days`;
    }
    return format(date, "hh:mm a");
  }

  function formatReceivedOn(createdAt: string | undefined) {
    if (!createdAt) return <span className="text-slate-500">—</span>;
    const date = new Date(createdAt);
    return (
      <div className="flex flex-col">
        <span className="font-medium text-white">{format(date, "dd MMM yyyy")}</span>
        <span className="text-[10px] text-slate-500">{format(date, "hh:mm a")}</span>
      </div>
    );
  }

  function buildPageNumbers(current: number, total: number) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b);
  }

  function canAssignComplaint(complaint: Complaint) {
    if (complaint.status === "Pending Review" || complaint.status === "Declined") {
      return false;
    }
    if (complaint.status === "Completed" || complaint.status === "Cancelled") {
      return true;
    }
    return !blocksComplaintReassignment(complaint.taskScheduleStatus);
  }

  function assignLockReason(complaint: Complaint) {
    if (complaint.status === "Pending Review") {
      return "Confirm this complaint from Alerts before assigning";
    }
    if (complaint.status === "Declined") {
      return "Declined complaints cannot be assigned";
    }
    if (complaint.status === "Completed" || complaint.status === "Cancelled") {
      return "";
    }
    if (blocksComplaintReassignment(complaint.taskScheduleStatus)) {
      return `Linked task is ${complaint.taskScheduleStatus}. Reopen before reassigning.`;
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

  function getRescheduleInfo(complaint: Complaint) {
    if (!complaint.history || complaint.history.length === 0) return null;
    return [...complaint.history].reverse().find(h => h.action === "Revisit Scheduled");
  }

  /* ─── KpiDetailsModal Helper ─── */
  function KpiDetailsModal({
    isOpen,
    onClose,
    title,
    filters,
    onStartWork,
    role,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    filters: any;
    onStartWork: (complaint: Complaint) => void;
    role: "admin" | "team";
  }) {
    const { data, isLoading } = useQuery({
      queryKey: ["complaints-details", filters],
      queryFn: () => fetchComplaints({ ...filters, limit: 50 }),
      enabled: isOpen,
    });

    const items = data?.items ?? [];

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(modalViewportClass, "max-h-[85vh] overflow-hidden flex flex-col bg-[#0b1424] border-white/10 text-white p-0 sm:max-w-4xl")}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-24 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <ClipboardList className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium">No complaints found matching this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className={summaryListCardClass}
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-blue-400/80 mb-0.5">{item.complaintId}</p>
                        <h4 className={cn("text-sm font-bold text-white", wrapTextClass)}>{item.clientName}</h4>
                      </div>
                      <Badge
                        className="w-fit shrink-0 self-start"
                        variant={
                          item.status === "Completed" || item.status === "Resolved"
                            ? "success"
                            : item.status === "In Progress"
                            ? "info"
                            : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <ComplaintSummaryText
                      className="mb-4"
                      description={item.description || item.title}
                      location={item.location}
                    />

                    <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {item.createdAt ? formatComplaintDate(item.createdAt) : "—"}
                        </div>
                      </div>

                      {role === "team" && item.status === "Assigned" && (
                        <button
                          onClick={() => {
                            onStartWork(item);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          <Play className="h-3 w-3" />
                          Start Work
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  export function ComplaintsPage({ role }: { role: "admin" | "team" }) {
    const { ready } = useSession(role);
    const searchParams = useSearchParams();
    const router = useRouter();
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
    const [detailModal, setDetailModal] = useState<{
      isOpen: boolean;
      title: string;
      filters: any;
    }>({
      isOpen: false,
      title: "",
      filters: {},
    });
    const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
    const [revisitTarget, setRevisitTarget] = useState<Complaint | null>(null);
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
        scope: role === "team" ? ACTIVE_COMPLAINT_SCOPE : ("reviewed" as const),
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

    const { data, isLoading, isError, error, refetch } = useComplaints(listParams, ready);
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

    // Redirect to complaint details if id is in URL
    useEffect(() => {
      const id = searchParams.get("id");
      if (id) {
        router.replace(getComplaintDetailsPath(role, id));
      }
    }, [searchParams, router, role]);

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
          onClick: () => setDetailModal({
            isOpen: true,
            title: "All Complaints",
            filters: { ...statsParams, scope: "reviewed" }
          }),
        },
        {
          label: "Resolved",
          value: stats?.resolved ?? 0,
          icon: CheckCircle2,
          color: "green" as const,
          onClick: () => setDetailModal({
            isOpen: true,
            title: "Resolved Complaints",
            filters: { ...statsParams, displayStatus: "Completed" }
          }),
        },
        {
          label: "Unresolved",
          value: stats?.unresolved ?? 0,
          icon: AlertTriangle,
          color: "orange" as const,
          onClick: () => setDetailModal({
            isOpen: true,
            title: "Unresolved Complaints",
            filters: { ...statsParams, displayStatus: "Unresolved" }
          }),
        },
        {
          label: "Rescheduled",
          value: items.filter(c => getDisplayStatus(c) === "Revisit").length,
          icon: RefreshCw,
          color: "blue" as const,
          onClick: () => {
            setDisplayStatus("Revisit");
            setPage(1);
          },
        },
      ],
      [stats, statsParams, items]
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
          await queryClient.invalidateQueries({ queryKey: ["complaints"] });
          await queryClient.invalidateQueries({ queryKey: ["tasks"] });
          await queryClient.invalidateQueries({ queryKey: ["alerts"] });
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Assignment failed"));
        }
      });
    };

    const handleStartWork = (complaint: Complaint) => {
      startTransition(async () => {
        try {
          await startComplaint(complaint._id);
          toast.success("Work started successfully");
          await refetch();
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Failed to start work"));
        }
      });
    };

    const handleScheduleRevisitSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!revisitTarget) return;

      const formData = new FormData(e.currentTarget);
      startTransition(async () => {
        try {
          await scheduleRevisit(revisitTarget._id, {
            date: formData.get("date") as string,
            timeSlot: formData.get("timeSlot") as string,
            team: formData.get("team") as string,
            remarks: formData.get("remarks") as string,
          });
          toast.success("Revisit scheduled successfully");
          setRevisitTarget(null);
          await refetch();
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Failed to schedule revisit"));
        }
      });
    };

    const handleExport = async () => {
      try {
        const fullFilters = {
          ...listParams,
          page: 1,
          limit: 1000,
        };

        const response = await fetchComplaints(fullFilters);
        const complaintsToExport = response.items;

        if (!complaintsToExport || complaintsToExport.length === 0) {
          toast.error("No complaints found to export");
          return;
        }

        const headers = [
          "Complaint ID",
          "Customer Name",
          "Mobile",
          "Address",
          "Title",
          "Description",
          "Assigned Team",
          "Status",
          "Workflow Stage",
          "Created Date",
        ];

        const rows = complaintsToExport.map((c) => [
          c.complaintId,
          c.clientName,
          c.mobileNumber,
          c.location,
          c.title,
          c.description,
          c.assignedTeam || "—",
          c.status,
          getComplaintWorkflowStage(c),
          c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—",
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");
        XLSX.writeFile(workbook, `Complaints_Report_${Date.now()}.xlsx`);

        toast.success(`Successfully exported ${complaintsToExport.length} complaints to Excel`);
      } catch (error) {
        toast.error("Failed to export complaints");
      }
    };

    if (!ready) return null;

    return (
      <DashboardShell
        role={role}
        title="Complaints"
        subtitle="Manage and assign complaints to service teams."
      >
        <KpiDetailsModal
          {...detailModal}
          role={role}
          onClose={() => setDetailModal((p) => ({ ...p, isOpen: false }))}
          onStartWork={handleStartWork}
        />
        <div className="space-y-4">
          {/* ── KPI Cards ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {statsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-xl bg-white/[0.04]" />
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
                      onClick={kpi.onClick}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-gradient-to-br px-4 py-3 cursor-pointer hover:scale-[1.02] transition-transform",
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
          </motion.div>

          {/* ── Filters ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search..."
                  className="h-9 rounded-xl border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30"
                />
              </div>

              <select
                value={displayStatus}
                onChange={(e) => {
                  setDisplayStatus(e.target.value as DisplayStatusFilter);
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-white/10 bg-app px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {DISPLAY_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-app text-white">
                    {s === "All" ? "All Status" : s}
                  </option>
                ))}
              </select>

              {canManage && (
                <select
                  value={teamFilter}
                  onChange={(e) => {
                    setTeamFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border border-white/10 bg-app px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {teamOptions.map((team) => (
                    <option key={team} value={team} className="bg-app text-white">
                      {team}
                    </option>
                  ))}
                </select>
              )}

              <DropdownMenu open={dateMenuOpen} onOpenChange={setDateMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
                    <span className="hidden sm:inline">{dateLabel}</span>
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
                  variant="outline"
                  onClick={handleExport}
                  className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}

              {canManage && (
                <Button
                  onClick={() => setShowNewComplaint(true)}
                  className="h-9 rounded-xl bg-blue-600 px-3 text-xs text-white shadow-sm hover:bg-blue-500"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Complaint</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <TableElement>
                <THead>
                  <tr className="border-b border-white/10">
                    <TH className="w-[12%] text-xs">Complaint Received On</TH>
                    <TH className="w-[10%] text-xs">ID</TH>
                    <TH className="w-[12%] text-xs">Customer Name</TH>
                    <TH className="w-[15%] text-xs">Address</TH>
                    <TH className="w-[10%] text-xs">Payment</TH>
                    <TH className="w-[10%] text-xs">Complaint Type</TH>
                    <TH className="w-[10%] text-xs">Assigned Team</TH>
                    <TH className="w-[10%] text-xs">Status</TH>
                    <TH className="w-[8%] text-xs text-right">Assign/<br /> Reassign/<br /> Reschedule</TH>
                  </tr>
                </THead>
                <tbody>
                  {isError ? (
                    <TR>
                      <TD colSpan={canManage ? 10 : 9}>
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                          <p className="font-medium text-rose-300">Failed to load complaints</p>
                          <p className="text-sm text-slate-400">
                            {getApiErrorMessage(error, "The request timed out or the server is unavailable.")}
                          </p>
                          <Button
                            variant="outline"
                            className="border-white/10"
                            onClick={() => void refetch()}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ) : isLoading && !data ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TR key={i}>
                        <TD colSpan={canManage ? 10 : 9}>
                          <Skeleton className="h-10 rounded-lg bg-white/[0.04]" />
                        </TD>
                      </TR>
                    ))
                  ) : items.length === 0 ? (
                    <TR>
                      <TD colSpan={canManage ? 10 : 9}>
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                          <p className="font-medium text-white">No complaints found</p>
                          <p className="text-sm text-slate-400">
                            Try adjusting your search or filters.
                          </p>
                        </div>
                      </TD>
                    </TR>
                  ) : (
                    items.map((complaint, index) => {
                          const rowStatus = getDisplayStatus(complaint);
                          const serial = (page - 1) * limit + index + 1;
                          const isPaid =
                            complaint.paymentStatus === "Paid" ||
                            complaint.paymentStatus === "Partially Paid";
                          const materialPaymentLabel = complaint.materialPaymentStatus;
                          const canAssign = canManage && canAssignComplaint(complaint);

                          return (
                            <TR
                              key={complaint._id}
                              className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] cursor-pointer transition-colors"
                              onClick={() => router.push(getComplaintDetailsPath(role, complaint.complaintId))}
                            >
                              <TD className="text-xs text-slate-400">
                                {formatReceivedOn(complaint.createdAt)}
                              </TD>
                              <TD>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(getComplaintDetailsPath(role, complaint.complaintId));
                                  }}
                                  className="text-xs font-medium text-blue-400 hover:underline"
                                >
                                  {complaint.complaintId}
                                </button>
                              </TD>
                              <TD>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white">{complaint.clientName}</span>
                                  <span className="text-[10px] font-bold text-blue-400/80 mt-1 uppercase tracking-wider">
                                    {complaint.createdAt ? formatComplaintAge(complaint.createdAt) : "—"}
                                  </span>
                                </div>
                              </TD>
                              <TD className={cn("text-xs text-slate-400 max-w-[180px] whitespace-normal", wrapTextClass)}>{complaint.location}</TD>
                              <TD>
                                {materialPaymentLabel ? (
                                  <Badge className={cn("rounded-full border-0 font-normal text-[10px]", getMaterialPaymentStatusBadgeClass(materialPaymentLabel))}>
                                    {materialPaymentLabel}
                                  </Badge>
                                ) : (
                                  <Badge
                                    className={cn(
                                      "rounded-full border-0 font-normal text-[10px]",
                                      isPaid
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-rose-500/15 text-rose-400"
                                    )}
                                  >
                                    {isPaid ? "Paid" : "Unpaid"}
                                  </Badge>
                                )}
                              </TD>
                              <TD className={cn("max-w-[180px] text-xs text-slate-200 whitespace-normal", wrapTextClass)}>
                                {complaint.complaintType === "Other" ? complaint.complaintDescription : (complaint.complaintType || complaint.title)}
                              </TD>
                              <TD>
                                {complaint.assignedTeam ? (
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-medium w-fit",
                                        teamBadgeClass(complaint.assignedTeam)
                                      )}
                                    >
                                      {complaint.assignedTeam}
                                    </span>
                                    {complaint.availableDate && (
                                      <div className="flex flex-col gap-0.5 mt-0.5">
                                        <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold">
                                          <Calendar className="h-2.5 w-2.5" />
                                          {format(new Date(complaint.availableDate), "dd MMM")}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                          <Clock className="h-2.5 w-2.5" />
                                          {complaint.timeSlot || "Any time"}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">—</span>
                                )}
                              </TD>
                              <TD>
                                <div className="flex flex-col gap-1">
                                  <Badge className={cn("rounded-full border-0 font-normal text-[10px] w-fit", statusBadgeClass(rowStatus))}>
                                    {rowStatus}
                                  </Badge>
                                  {rowStatus === "Revisit" && (
                                    <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold ml-0.5">
                                      <RefreshCw className="h-2.5 w-2.5" />
                                      Rescheduled
                                    </div>
                                  )}
                                  {rowStatus === "Pending Review" && (
                                    <span className="text-[10px] font-bold text-rose-500 ml-1">
                                      {(() => {
                                        if (!complaint.createdAt) return "";
                                        const date = new Date(complaint.createdAt);
                                        const now = new Date();
                                        const diffDays = Math.floor(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                        return diffDays > 0 ? `+${diffDays}` : "";
                                      })()}
                                    </span>
                                  )}
                                </div>
                              </TD>
                              <TD className="text-right">
                                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => router.push(getComplaintDetailsPath(role, complaint.complaintId))}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {role === "team" && complaint.status === "Assigned" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartWork(complaint)}
                                      className="h-7 rounded-lg bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-50"
                                    >
                                      <Play className="mr-1 h-3 w-3" />
                                      Start
                                    </Button>
                                  )}
                                  {canManage && complaint.status !== "Completed" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!canAssign}
                                        title={!canAssign ? assignLockReason(complaint) : undefined}
                                        onClick={() => canAssign && setAssignTarget(complaint)}
                                        className="h-7 rounded-lg border-white/10 bg-white/5 px-2 text-[10px] text-white hover:bg-white/10 disabled:opacity-40"
                                      >
                                        <Users className="h-3 w-3" />
                                        {complaint.assignedTeam ? "Reassign" : "Assign"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        title="Reschedule"
                                        onClick={() => setRevisitTarget(complaint)}
                                        className="h-7 w-7 p-0 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TD>
                            </TR>
                          );
                    })
                  )}
                </tbody>
              </TableElement>
            </div>
          </div>

          {/* ── Pagination ── */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-medium text-white">{showingFrom}</span> to{" "}
              <span className="font-medium text-white">{showingTo}</span> of{" "}
              <span className="font-medium text-white">{total}</span>
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 w-8 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {pageNumbers.map((pageNum, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev !== undefined && pageNum - prev > 1;
                  return (
                    <span key={pageNum} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-500">…</span>}
                      <button
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors",
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
                  className="h-8 w-8 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={Boolean(revisitTarget)}
          onOpenChange={(o) => !o && setRevisitTarget(null)}
        >
          <DialogContent className="sm:max-w-[500px] border-white/10 bg-[#0b1424] text-white rounded-2xl">
            <form onSubmit={handleScheduleRevisitSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Schedule Revisit / Reschedule</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Plan or change a visit for this complaint.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-slate-500">Visit Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={revisitTarget?.availableDate}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-white/5 border-white/10 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeSlot" className="text-xs font-bold uppercase tracking-wider text-slate-500">Time Slot</Label>
                  <select
                    id="timeSlot"
                    name="timeSlot"
                    required
                    defaultValue={revisitTarget?.timeSlot}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="" style={{backgroundColor: "#0f172a"}}>Select slot</option>
                    {[
                      "9:00 AM - 10:00 AM",
                      "10:00 AM - 11:00 AM",
                      "11:00 AM - 12:00 PM",
                      "12:00 PM - 1:00 PM",
                      "1:00 PM - 2:00 PM",
                      "2:00 PM - 3:00 PM",
                      "3:00 PM - 4:00 PM",
                      "4:00 PM - 5:00 PM",
                      "5:00 PM - 6:00 PM",
                      "6:00 PM - 7:00 PM",
                    ].map(slot => <option key={slot} value={slot} style={{backgroundColor: "#0f172a"}}>{slot}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="team" className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Team</Label>
                  <select
                    id="team"
                    name="team"
                    required
                    defaultValue={revisitTarget?.assignedTeam}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="" style={{backgroundColor: "#0f172a"}}>Select team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team.teamName} style={{backgroundColor: "#0f172a"}}>{team.teamName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructions / Remarks</Label>
                  <Textarea id="remarks" name="remarks" placeholder="Notes for the visiting team..." className="bg-white/5 border-white/10 rounded-xl min-h-[100px]" />
                </div>
              </div>

              <DialogFooter className="gap-3">
                <Button type="button" variant="ghost" onClick={() => setRevisitTarget(null)} className="rounded-xl border-white/5">Cancel</Button>
                <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-6 font-bold shadow-lg shadow-blue-600/20">
                  {pending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Assign Dialog ── */}
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
                Select a team member to handle this complaint.
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
                <Label className="text-xs text-slate-400">Select team member</Label>
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

        {/* ── New Complaint Dialog ── */}
        <Dialog open={showNewComplaint} onOpenChange={setShowNewComplaint}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] border-white/10 bg-app text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">New Complaint</DialogTitle>
              <DialogDescription className="text-slate-400">
                Register a new complaint for review and team assignment.
              </DialogDescription>
            </DialogHeader>
            <ComplaintRegistrationForm
              source="MANUAL"
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