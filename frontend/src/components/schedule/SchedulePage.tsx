"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { canManageSchedules, canUpdateScheduleProgress } from "@/lib/permissions";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { useTaskCalendar } from "@/hooks/useTaskCalendar";
import { useCreateTask } from "@/hooks/useCreateTask";
import { TaskStatsCards } from "@/components/schedule/TaskStatsCards";
import { ScheduleTaskStatusChart } from "@/components/schedule/ScheduleTaskStatusChart";
import { ScheduleMonthCalendar } from "@/components/schedule/ScheduleMonthCalendar";
import { AssignedTasksTable } from "@/components/schedule/AssignedTasksTable";
import { CreateTaskModal } from "@/components/schedule/CreateTaskModal";
import { TeamSelectItems } from "@/components/shared/TeamSelectItems";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAssignableUsers } from "@/services/users";
import { formatDueDate, toDateKey } from "@/lib/task-constants";
import type { TaskPayload } from "@/lib/task.types";
import { useFeedbackPrompt } from "@/components/feedback/FeedbackPromptProvider";
import { feedbackTargetFromTask } from "@/lib/feedback-target";

export function SchedulePage({ role = "admin" }: { role?: "admin" | "team" }) {
  const { ready, user } = useSession(role);
  const canManage = canManageSchedules(user?.role);
  const canUpdateProgress = canUpdateScheduleProgress(user?.role);

  const today = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [teamFilter, setTeamFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);

  const teamParam = teamFilter !== "all" ? teamFilter : undefined;

  const { data: stats, isLoading: statsLoading } = useTaskStats(teamParam);
  const { data: calendarData, isLoading: calendarLoading } = useTaskCalendar(
    calendarYear,
    calendarMonth,
    teamParam
  );
  const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching } = useTasks({
    dueDate: selectedDate,
    team: teamParam,
    limit: 50,
    sortBy: "dueDate",
    sortOrder: "asc",
  });

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: canManage,
  });

  const createMutation = useCreateTask();
  const { openFeedback } = useFeedbackPrompt();
  const tasks = tasksData?.items ?? [];

  const selectedDateLabel = formatDueDate(selectedDate);

  const handleCreate = async (payload: TaskPayload) => {
    await createMutation.mutateAsync(payload);
    toast.success("Task created and assigned successfully");
  };

  const resetToToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth() + 1);
    setSelectedDate(toDateKey(now));
  };

  if (!ready) return null;

  return (
    <DashboardShell
      role={role}
      title="Schedule"
      subtitle={
        canManage
          ? "Create, assign, and track tasks across your organization"
          : "View and update your assigned tasks"
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[180px] border-white/10 bg-white/[0.03]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <TeamSelectItems includeAll />
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="outline" size="sm" onClick={resetToToday}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          )}
        </div>

        <TaskStatsCards stats={stats} isLoading={statsLoading} />

        <div className="grid gap-5 xl:grid-cols-2">
          <ScheduleTaskStatusChart stats={stats} isLoading={statsLoading} />
          <ScheduleMonthCalendar
            year={calendarYear}
            month={calendarMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={(y, m) => {
              setCalendarYear(y);
              setCalendarMonth(m);
            }}
            dayCounts={calendarData}
            isLoading={calendarLoading}
          />
        </div>

        <AssignedTasksTable
          tasks={tasks}
          selectedDateLabel={selectedDateLabel}
          isLoading={tasksLoading || tasksFetching}
          canManage={canManage}
          canUpdateProgress={canUpdateProgress}
          assignableUsers={assignableUsers}
          onTaskCompleted={(task) => openFeedback(feedbackTargetFromTask(task))}
        />
      </div>

      {canManage && (
        <CreateTaskModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          isSaving={createMutation.isPending}
          defaultDueDate={selectedDate}
        />
      )}
    </DashboardShell>
  );
}
