"use client";

import { toast } from "sonner";
import { Ban, Loader2, MoreHorizontal, RotateCcw, UserRound } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/task.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableElement, THead, TH, TD } from "@/components/ui/table";
import { usePatchTaskStatus, useReopenTask } from "@/hooks/usePatchTaskStatus";
import { useUpdateTask } from "@/hooks/useUpdateTask";
import {
  formatDueDate,
  panelClass,
  priorityAccentClass,
  priorityBadgeClass,
  statusBadgeVariant,
} from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";

const ACTIVE_STATUSES: TaskStatus[] = ["Pending", "In Progress", "Overdue"];

interface AssignedTasksTableProps {
  tasks: Task[];
  selectedDateLabel: string;
  isLoading?: boolean;
  canManage?: boolean;
  canUpdateProgress?: boolean;
  assignableUsers?: Array<{ _id: string; name: string; teamName?: string }>;
}

export function AssignedTasksTable({
  tasks,
  selectedDateLabel,
  isLoading,
  canManage,
  canUpdateProgress,
  assignableUsers = [],
}: AssignedTasksTableProps) {
  const patchMutation = usePatchTaskStatus();
  const reopenMutation = useReopenTask();
  const updateMutation = useUpdateTask();

  const handleStatus = async (task: Task, status: TaskStatus) => {
    try {
      await patchMutation.mutateAsync({ id: task._id, status });
      toast.success(`Task marked as ${status}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update status"));
    }
  };

  const handleReassign = async (task: Task, userId: string) => {
    try {
      await updateMutation.mutateAsync({ id: task._id, payload: { assignedUserId: userId } });
      toast.success("Task reassigned");
    } catch {
      toast.error("Failed to reassign task");
    }
  };

  const handleCancel = async (task: Task) => {
    try {
      await patchMutation.mutateAsync({ id: task._id, status: "Cancelled" });
      toast.success("Task cancelled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel task"));
    }
  };

  const handleReopen = async (task: Task) => {
    try {
      await reopenMutation.mutateAsync(task._id);
      toast.success("Task reopened");
    } catch {
      toast.error("Failed to reopen task");
    }
  };

  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Tasks</p>
          <p className="text-sm text-slate-500">Tasks for {selectedDateLabel}</p>
        </div>
        <Badge variant="info" className="rounded-full">
          Selected Date
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center px-6 text-center">
          <p className="font-medium text-white">No tasks for this date</p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? "Create a task or select another date on the calendar." : "No tasks are assigned to you on this date."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <TableElement>
            <THead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <TH className="text-slate-400">Task</TH>
                <TH className="text-slate-400">Complaint</TH>
                <TH className="text-slate-400">Assignee</TH>
                <TH className="text-slate-400">Team</TH>
                <TH className="text-slate-400">Priority</TH>
                <TH className="text-slate-400">Status</TH>
                <TH className="text-slate-400">Due Date</TH>
                {(canManage || canUpdateProgress) && <TH className="text-slate-400">Actions</TH>}
              </tr>
            </THead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task._id}
                  className={cn(
                    "border-b border-white/[0.04] border-l-4 hover:bg-white/[0.02]",
                    priorityAccentClass[task.priority] ?? "border-l-slate-500"
                  )}
                >
                  <TD>
                    <p className="font-semibold text-white">{task.title}</p>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                      {task.description || task.taskId}
                    </p>
                  </TD>
                  <TD className="font-mono text-sm text-blue-300">{task.complaintId || "—"}</TD>
                  <TD className="text-slate-200">{task.assignedUserName || "—"}</TD>
                  <TD>
                    <Badge variant="info" className="rounded-full">
                      {task.assignedTeamName || "—"}
                    </Badge>
                  </TD>
                  <TD>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                        priorityBadgeClass[task.priority]
                      )}
                    >
                      {task.priority}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant={statusBadgeVariant[task.status] ?? "default"}>
                      {task.status.toUpperCase()}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-slate-300">
                    {formatDueDate(task.dueDateKey ?? task.dueDate)}
                  </TD>
                  {(canManage || canUpdateProgress) && (
                    <TD>
                      <div className="flex items-center gap-1">
                        {canUpdateProgress && ACTIVE_STATUSES.includes(task.status) && (
                          <>
                            {task.status !== "In Progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={patchMutation.isPending}
                                onClick={() => void handleStatus(task, "In Progress")}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={patchMutation.isPending}
                              onClick={() => void handleStatus(task, "Completed")}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {task.isLocked && (
                                <DropdownMenuItem onClick={() => void handleReopen(task)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Reopen Task
                                </DropdownMenuItem>
                              )}
                              {!task.isLocked &&
                                ["Pending", "In Progress", "Overdue"].includes(task.status) && (
                                  <>
                                    {assignableUsers.map((user) => (
                                      <DropdownMenuItem
                                        key={user._id}
                                        onClick={() => void handleReassign(task, user._id)}
                                      >
                                        <UserRound className="mr-2 h-4 w-4" />
                                        Assign to {user.name}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem
                                      className="text-red-400"
                                      onClick={() => void handleCancel(task)}
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Cancel Task
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TD>
                  )}
                </tr>
              ))}
            </tbody>
          </TableElement>
        </div>
      )}
    </div>
  );
}
