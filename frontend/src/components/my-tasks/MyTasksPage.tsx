"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Loader2,
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { usePatchTaskStatus } from "@/hooks/usePatchTaskStatus";
import { fetchTask } from "@/services/task.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TaskStatus } from "@/lib/task.types";
import {
  formatDueDate,
  panelClass,
  priorityBadgeClass,
  statusBadgeVariant,
} from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import { canUpdateScheduleProgress } from "@/lib/permissions";
import { readUser } from "@/lib/storage";
import { useFeedbackPrompt } from "@/components/feedback/FeedbackPromptProvider";
import { feedbackTargetFromTask } from "@/lib/feedback-target";

const PROGRESS_OPTIONS: TaskStatus[] = ["Completed", "Need Re-visit", "Need Material"];

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div className={cn(panelClass, "flex items-center justify-between p-5")}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
      </div>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function TaskListCard({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}) {
  const customerName = task.complaint?.clientName ?? task.title;
  const address = task.complaint?.location ?? task.description ?? "—";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge className={cn("text-[10px]", priorityBadgeClass[task.priority])}>
          {task.priority}
        </Badge>
        <span className="text-xs font-mono text-slate-400">{task.taskId}</span>
      </div>
      <p className="font-semibold text-white line-clamp-1">{task.title}</p>
      <p className="mt-1 text-xs text-slate-400 line-clamp-1">{customerName}</p>
      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{address}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{formatDueDate(task.dueDate)}</span>
        <Badge variant={statusBadgeVariant[task.status] ?? "default"} className="text-[10px]">
          {task.status}
        </Badge>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Assigned by <span className="text-slate-300">{task.createdBy}</span>
        {task.assignedTeamName ? (
          <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
            {task.assignedTeamName}
          </span>
        ) : null}
      </p>
    </button>
  );
}

function TaskDetailPanel({
  task,
  canUpdate,
  onRefresh,
}: {
  task: Task;
  canUpdate: boolean;
  onRefresh: () => void;
}) {
  const patchMutation = usePatchTaskStatus();
  const { openFeedback } = useFeedbackPrompt();
  const [notes, setNotes] = useState("");
  const [nextStatus, setNextStatus] = useState<TaskStatus | "">("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<string>("");
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [revisitDate, setRevisitDate] = useState("");

  const complaint = task.complaint;
  const customerName = complaint?.clientName ?? task.title;
  const address = complaint?.location ?? "—";
  const mobile = complaint?.mobileNumber ?? "—";
  const description = complaint?.description ?? task.description ?? "No description provided.";

  const timeline = useMemo(() => {
    const entries = [...(task.history ?? [])].sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    );
    if (entries.length === 0) {
      return [
        {
          action: "Task Assigned",
          by: task.createdBy,
          status: "Pending",
          createdAt: task.createdAt,
        },
      ];
    }
    return entries;
  }, [task]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoFile(result);
    };
    reader.readAsDataURL(file);
  };

  const handleStart = async () => {
    try {
      await patchMutation.mutateAsync({ id: task._id, status: "In Progress" });
      toast.success("Task started");
      onRefresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start task"));
    }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) {
      toast.error("Please select a status");
      return;
    }
    if (nextStatus === "Need Material") {
      if (!materialName.trim() || !quantity) {
        toast.error("Material name and quantity are required");
        return;
      }
      if (!photoFile) {
        toast.error("Photo is required for material requests");
        return;
      }
    }
    if (nextStatus === "Completed" && !photoFile) {
      toast.error("Photo is required to mark task as completed");
      return;
    }
    if (nextStatus === "Need Re-visit" && !revisitDate) {
      toast.error("Re-visit date is required");
      return;
    }
    const completedStatus = nextStatus;
    try {
      await patchMutation.mutateAsync({
        id: task._id,
        status: nextStatus,
        notes: notes.trim() || undefined,
        photoUrl: photoFile || undefined,
        ...(nextStatus === "Need Material"
          ? {
              materialName: materialName.trim(),
              quantity: Number(quantity),
              unit: unit.trim(),
            }
          : {}),
        ...(nextStatus === "Need Re-visit" ? { revisitDate } : {}),
      });
      const message =
        nextStatus === "Need Re-visit"
          ? `Re-visit scheduled for ${revisitDate}`
          : nextStatus === "Need Material"
            ? "Material request sent to Service Head"
            : `Task marked as ${nextStatus}`;
      toast.success(message);
      setNotes("");
      setNextStatus("");
      setPhotoPreview("");
      setPhotoFile("");
      setMaterialName("");
      setQuantity("");
      setUnit("");
      setRevisitDate("");
      if (completedStatus === "Completed") {
        openFeedback(feedbackTargetFromTask(task));
      }
      onRefresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update status"));
    }
  };

  const showProgressForm = canUpdate && task.status === "In Progress";
  const showStartButton =
    canUpdate && ["Pending", "Overdue", "Need Re-visit"].includes(task.status);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Task Details</h2>
          <p className="text-sm text-slate-400">{task.taskId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(priorityBadgeClass[task.priority])}>{task.priority}</Badge>
          <Badge variant={statusBadgeVariant[task.status] ?? "default"}>{task.status}</Badge>
          {showStartButton && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={patchMutation.isPending}
              className="rounded-full bg-blue-600 hover:bg-blue-500"
            >
              {patchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1 h-3.5 w-3.5" />
              )}
              Start Task
            </Button>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <section className={cn(panelClass, "p-5")}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">
              Customer Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Customer Name</p>
                <p className="font-medium text-white">{customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mobile</p>
                <p className="font-medium text-white">{mobile}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-medium text-white">{address}</p>
              </div>
            </div>
          </section>

          <section className={cn(panelClass, "p-5")}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">
              Service Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Service Type</p>
                <p className="font-medium text-white">{complaint?.title ?? task.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Scheduled Date & Time</p>
                <p className="font-medium text-white">{formatDateTime(task.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Order / Complaint ID</p>
                <p className="font-medium font-mono text-white">
                  {task.complaintId ?? task.taskId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Assigned Date</p>
                <p className="font-medium text-white">{formatDateTime(task.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Assigned By</p>
                <p className="font-medium text-white">
                  {task.createdBy}
                  <span className="ml-1 text-xs text-slate-400">(Service Head)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Assigned Team</p>
                <p className="font-medium text-white">{task.assignedTeamName || "—"}</p>
              </div>
            </div>
          </section>

          <section className={cn(panelClass, "p-5")}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">
              Complaint Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">{description}</p>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Uploaded"
                className="mt-3 max-h-40 rounded-lg border border-white/10 object-cover"
              />
            )}
          </section>

          {showProgressForm && (
            <section className={cn(panelClass, "p-5")}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">
                Update Task Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Add Update / Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter update notes..."
                    className="min-h-[80px] rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Next Status</label>
                  <Select
                    value={nextStatus}
                    onValueChange={(v) => setNextStatus(v as TaskStatus)}
                  >
                    <SelectTrigger className="rounded-xl border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRESS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {nextStatus === "Need Re-visit" && (
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-400">Re-visit Date</label>
                    <Input
                      type="date"
                      value={revisitDate}
                      onChange={(e) => setRevisitDate(e.target.value)}
                      className="rounded-xl border-white/10 bg-white/5 text-white"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Schedule and dashboard will show this re-visit date.
                    </p>
                  </div>
                )}
                {nextStatus === "Need Material" && (
                  <div className="space-y-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                    <p className="text-xs font-semibold uppercase text-purple-300">
                      Material Requirement
                    </p>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Material Name</label>
                      <Input
                        value={materialName}
                        onChange={(e) => setMaterialName(e.target.value)}
                        className="rounded-xl border-white/10 bg-white/5 text-white"
                        placeholder="e.g. AC Filter, Drain Pipe"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Quantity</label>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="rounded-xl border-white/10 bg-white/5 text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Unit (optional)</label>
                        <Input
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="rounded-xl border-white/10 bg-white/5 text-white"
                          placeholder="pcs, kg, m"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Request goes to Service Head for approval, then Accounts or Store Manager.
                      A photo is required and will be attached to the material request.
                    </p>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">
                    Add Photo {["Need Material", "Completed"].includes(nextStatus) ? "*" : ""}
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-6 transition hover:border-blue-500/40 hover:bg-white/[0.06]">
                    <Upload className="mb-2 h-6 w-6 text-slate-400" />
                    <span className="text-xs text-slate-400">JPG, PNG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="mt-2 max-h-32 rounded-lg border border-white/10"
                    />
                  )}
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={patchMutation.isPending || !nextStatus}
                  className="h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-500"
                >
                  {patchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update Status"
                  )}
                </Button>
                <p className="text-center text-[11px] text-slate-500">
                  * Updates will be visible to Service Head and logged in system.
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className={cn(panelClass, "p-5")}>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">
            Task Timeline
          </h3>
          <div className="space-y-4">
            {timeline.map((entry, i) => {
              const isLast = i === timeline.length - 1;
              const dotColor =
                entry.status === "Completed"
                  ? "bg-emerald-500"
                  : entry.status === "In Progress"
                    ? "bg-blue-500"
                    : entry.status === "Need Re-visit"
                      ? "bg-orange-500"
                      : entry.status === "Need Material"
                        ? "bg-purple-500"
                        : "bg-slate-500";

              return (
                <div key={`${entry.action}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("h-3 w-3 rounded-full ring-4 ring-white/5", dotColor)} />
                    {!isLast && <span className="mt-1 w-px flex-1 bg-white/10" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-white">
                      {entry.action.replace(/^Marked\s+/i, "")}
                    </p>
                    <p className="text-xs text-slate-400">by {entry.by}</p>
                    {entry.remarks && (
                      <p className="mt-1 text-xs text-slate-500">{entry.remarks}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function MyTasksPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const searchParams = useSearchParams();
  const user = readUser();
  const canUpdate = canUpdateScheduleProgress(user?.role);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const limit = 5;

  const { data: stats, isLoading: statsLoading } = useTaskStats();
  const { data, isLoading, refetch } = useTasks({
    q: appliedSearch || undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    priority: priorityFilter !== "All" ? priorityFilter : undefined,
    dueDate: dateFilter || undefined,
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const tasks = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadTaskDetail = useCallback(async (taskId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchTask(taskId);
      setSelectedTask(detail);
    } catch {
      toast.error("Failed to load task details");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    const taskId = searchParams.get("taskId");
    if (q) {
      setSearch(q);
      setAppliedSearch(q);
    }
    if (taskId) {
      void loadTaskDetail(taskId);
    }
  }, [searchParams, loadTaskDetail]);

  useEffect(() => {
    if (tasks.length > 0 && !selectedTask && !searchParams.get("taskId")) {
      void loadTaskDetail(tasks[0]._id);
    }
  }, [tasks, selectedTask, searchParams, loadTaskDetail]);

  const handleSearch = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleSelectTask = (task: Task) => {
    void loadTaskDetail(task._id);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="My Tasks"
      subtitle="Tasks assigned by Service Head"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Assigned"
            value={stats?.total ?? 0}
            icon={ClipboardList}
            iconClass="bg-blue-500/15 text-blue-400"
          />
          <StatCard
            label="In Progress"
            value={stats?.inProgress ?? 0}
            icon={Clock}
            iconClass="bg-amber-500/15 text-amber-400"
          />
          <StatCard
            label="Pending"
            value={stats?.pending ?? 0}
            icon={AlertCircle}
            iconClass="bg-orange-500/15 text-orange-400"
          />
          <StatCard
            label="Completed Today"
            value={stats?.completedToday ?? 0}
            icon={CheckCircle2}
            iconClass="bg-emerald-500/15 text-emerald-400"
          />
        </div>

        <div className={cn(panelClass, "flex flex-wrap items-center gap-3 p-4")}>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search tasks (Order ID, Customer, Address)..."
              className="h-10 rounded-xl border-white/10 bg-white/5 pl-9 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {["All", "Pending", "In Progress", "Completed", "Need Re-visit", "Need Material", "Overdue"].map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {s === "All" ? "All Status" : s}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              {["All", "Low", "Medium", "High", "Critical"].map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "All" ? "All Priority" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="h-10 w-[160px] rounded-xl border-white/10 bg-white/5 text-white"
          />
          <Button
            variant="outline"
            onClick={handleSearch}
            className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className={cn(panelClass, "flex flex-col p-4")}>
            <h3 className="mb-3 text-sm font-semibold text-white">Assigned Tasks</h3>
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">No tasks found</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskListCard
                    key={task._id}
                    task={task}
                    selected={selectedTask?._id === task._id}
                    onSelect={() => handleSelectTask(task)}
                  />
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
              <span>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tasks
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 w-8 text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className={cn(panelClass, "min-h-[600px] p-5")}>
            {loadingDetail ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              </div>
            ) : selectedTask ? (
              <TaskDetailPanel
                task={selectedTask}
                canUpdate={canUpdate}
                onRefresh={() => {
                  void refetch();
                  void loadTaskDetail(selectedTask._id);
                }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <ClipboardList className="mb-3 h-12 w-12 opacity-30" />
                <p>Select a task to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
