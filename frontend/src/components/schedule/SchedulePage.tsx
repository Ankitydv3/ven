"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { canManageSchedules } from "@/lib/permissions";
import { useSchedules } from "@/hooks/useSchedules";
import { useCalendarSchedules } from "@/hooks/useCalendarSchedules";
import { useCreateSchedule } from "@/hooks/useCreateSchedule";
import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleStats } from "@/components/schedule/ScheduleStats";
import { ScheduleFilters } from "@/components/schedule/ScheduleFilters";
import { ScheduleSkeleton } from "@/components/schedule/ScheduleSkeleton";
import { TaskTable } from "@/components/schedule/TaskTable";
import { TaskCalendar } from "@/components/schedule/TaskCalendar";
import { AssignTaskModal } from "@/components/schedule/AssignTaskModal";
import { CustomerPagination } from "@/components/customers/customer-pagination";
import type { CalendarView, SchedulePayload } from "@/lib/schedule.types";
import { addDays, startOfWeek, toDateInputValue } from "@/lib/schedule-constants";

const PAGE_SIZE = 8;

export function SchedulePage({ role = "admin" }: { role?: "admin" | "team" }) {
  const { ready, user } = useSession(role);
  const canAssignTasks = canManageSchedules(user?.role);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("All");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const rangeStart = useMemo(() => {
    if (calendarView === "day") return toDateInputValue(anchorDate);
    if (calendarView === "week") return toDateInputValue(startOfWeek(anchorDate));
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    return toDateInputValue(startOfWeek(monthStart));
  }, [anchorDate, calendarView]);

  const rangeEnd = useMemo(() => {
    if (calendarView === "day") return toDateInputValue(anchorDate);
    if (calendarView === "week") return toDateInputValue(addDays(startOfWeek(anchorDate), 6));
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    return toDateInputValue(addDays(startOfWeek(monthEnd), 6));
  }, [anchorDate, calendarView]);

  const [startDate, setStartDate] = useState(rangeStart);
  const [endDate, setEndDate] = useState(rangeEnd);

  const tableFilters = useMemo(
    () => ({
      q: search.trim() || undefined,
      team: team !== "All" ? team : undefined,
      status: status !== "All" ? status : undefined,
      priority: priority !== "All" ? priority : undefined,
      startDate,
      endDate,
      page,
      limit: PAGE_SIZE,
      sortBy: "scheduledDate",
      sortOrder: "asc" as const,
    }),
    [search, team, status, priority, startDate, endDate, page]
  );

  const { data, isLoading } = useSchedules(tableFilters);
  const { data: calendarTasks = [], isLoading: calendarLoading } = useCalendarSchedules({
    startDate: rangeStart,
    endDate: rangeEnd,
    team: team !== "All" ? team : undefined,
  });

  const createMutation = useCreateSchedule();

  const tasks = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleAssign = async (payload: SchedulePayload) => {
    await createMutation.mutateAsync(payload);
    toast.success("Task assigned and scheduled successfully");
    setPage(1);
  };

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell
      role={role}
      title="Schedule"
      subtitle={
        canAssignTasks
          ? "Plan, assign, and track service tasks across teams"
          : "View and track your assigned tasks"
      }
    >
      <div className="space-y-5 rounded-3xl bg-slate-50/50 p-1 dark:bg-[#071A17]">
        <ScheduleHeader
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(value) => {
            setStartDate(value);
            setPage(1);
          }}
          onEndDateChange={(value) => {
            setEndDate(value);
            setPage(1);
          }}
          onAssignTask={() => setAssignOpen(true)}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          filtersOpen={filtersOpen}
          showAssignTask={canAssignTasks}
        />

        <ScheduleStats startDate={startDate} endDate={endDate} />

        {filtersOpen && (
          <ScheduleFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            team={team}
            onTeamChange={(value) => {
              setTeam(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            priority={priority}
            onPriorityChange={(value) => {
              setPriority(value);
              setPage(1);
            }}
            showTeamFilter={canAssignTasks}
          />
        )}

        {isLoading && !data ? (
          <ScheduleSkeleton />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
            <div className="min-w-0 space-y-4">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                  Scheduled Tasks
                </h3>
                <TaskTable tasks={tasks} isLoading={isLoading} />
              </div>

              {!isLoading && tasks.length > 0 && (
                <CustomerPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                Calendar Scheduler
              </h3>
              <div className="relative">
                <TaskCalendar
                  tasks={calendarTasks}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  anchorDate={anchorDate}
                  onAnchorDateChange={setAnchorDate}
                  isLoading={calendarLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {canAssignTasks && (
        <AssignTaskModal
          open={assignOpen}
          onOpenChange={setAssignOpen}
          onSubmit={handleAssign}
          isSaving={createMutation.isPending}
        />
      )}
    </DashboardShell>
  );
}
