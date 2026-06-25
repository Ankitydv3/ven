"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle,
  Calendar,
  Download,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  Star,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { KpiCard } from "./KpiCard";
import { TeamPerformanceTable } from "./TeamPerformanceTable";
import { FeedbackList, UserFeedbackTable } from "./FeedbackSection";
import { SegmentedControl, Divider } from "@/components/ui/card";
import { useReports, useExportReports } from "@/hooks/useReports";
import { ReportsPageSkeleton } from "./ReportsSkeleton";
import { ReportsErrorState } from "./ReportsStates";
import { readUser } from "@/lib/storage";
import { canViewOrgReports } from "@/lib/permissions";
import type { ReportsFilters } from "@/services/reportService";

const TaskStatusDonut = dynamic(
  () => import("./TaskStatusDonut").then((m) => m.TaskStatusDonut),
  { ssr: false, loading: () => null }
);
const TasksByTeamChart = dynamic(
  () => import("./TasksByTeamChart").then((m) => m.TasksByTeamChart),
  { ssr: false, loading: () => null }
);

function getDefaultDateRange() {
  const now = new Date();
  return {
    startDate: format(startOfMonth(now), "yyyy-MM-dd"),
    endDate: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

function formatDateRangeLabel(startDate: string, endDate: string) {
  const start = format(new Date(startDate), "dd MMM yyyy");
  const end = format(new Date(endDate), "dd MMM yyyy");
  return `${start} – ${end}`;
}

export function ReportsPage({ role = "admin" }: { role?: "admin" | "team" }) {
  const sessionUser = readUser();
  const showOrgReports = canViewOrgReports(sessionUser?.role);
  const defaults = getDefaultDateRange();
  const [activeTab, setActiveTab] = useState("All Teams");
  const [teamDropdown, setTeamDropdown] = useState("All Teams");
  const [dateRange] = useState(defaults);

  const filters: ReportsFilters = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      team: activeTab !== "All Teams" ? activeTab : undefined,
    }),
    [dateRange, activeTab]
  );

  const { data, isLoading, isError, refetch, isFetching } = useReports(filters);
  const exportReports = useExportReports();

  const teamTabs = useMemo(() => {
    const teams = data?.summary.teams ?? [];
    return ["All Teams", ...teams];
  }, [data?.summary.teams]);

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const { summary, feedback } = data;
    return [
      {
        label: "Total Tasks Assigned",
        value: summary.totalTasksAssigned,
        growth: summary.growth.totalTasksAssigned.growth,
        trend: summary.growth.totalTasksAssigned.trend,
        icon: Users,
        color: "blue" as const,
      },
      {
        label: "Completed Tasks",
        value: summary.completedTasks,
        growth: summary.growth.completedTasks.growth,
        trend: summary.growth.completedTasks.trend,
        icon: CheckCircle,
        color: "green" as const,
      },
      {
        label: "Positive Feedback",
        value: feedback?.summary.positiveCount ?? 0,
        growth: feedback?.summary.growth.totalFeedback.growth ?? "0%",
        trend: feedback?.summary.growth.totalFeedback.trend ?? ("up" as const),
        icon: ThumbsUp,
        color: "green" as const,
      },
      {
        label: "Negative Feedback",
        value: feedback?.summary.negativeCount ?? 0,
        growth: feedback?.summary.growth.totalFeedback.growth ?? "0%",
        trend: feedback?.summary.growth.totalFeedback.trend ?? ("down" as const),
        icon: ThumbsDown,
        color: "red" as const,
      },
      {
        label: "Average Rating",
        value: feedback?.summary.averageRating ? `${feedback.summary.averageRating}/5` : "—",
        growth: feedback?.summary.growth.totalFeedback.growth ?? "0%",
        trend: feedback?.summary.growth.totalFeedback.trend ?? ("up" as const),
        icon: Star,
        color: "orange" as const,
      },
    ];
  }, [data]);

  const handleExport = useCallback(() => {
    if (data) {
      exportReports.mutate(data);
    }
  }, [exportReports, data]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setTeamDropdown(tab === "All Teams" ? "All Teams" : tab);
  };

  const handleDropdownChange = (value: string) => {
    setTeamDropdown(value);
    setActiveTab(value);
  };

  const dateLabel = data
    ? formatDateRangeLabel(data.summary.dateRange.startDate, data.summary.dateRange.endDate)
    : formatDateRangeLabel(dateRange.startDate, dateRange.endDate);

  const activeFilterCount = activeTab !== "All Teams" ? 1 : 0;

  if (isLoading) {
    return (
      <DashboardShell
        role={role}
        title="Reports"
        subtitle={showOrgReports ? "Performance overview of all service teams" : "Your team's performance overview"}
      >
        <ReportsPageSkeleton />
      </DashboardShell>
    );
  }

  if (isError || !data) {
    return (
      <DashboardShell
        role={role}
        title="Reports"
        subtitle={showOrgReports ? "Performance overview of all service teams" : "Your team's performance overview"}
      >
        <ReportsErrorState onRetry={() => refetch()} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="Reports"
      subtitle={showOrgReports ? "Performance overview of all service teams" : "Your team's performance overview"}
    >
      <div className="mx-auto w-full max-w-[1680px] space-y-6 2xl:space-y-8">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          {showOrgReports ? (
            <>
              {/* Desktop / tablet landscape: segmented control */}
              <div className="hidden md:block">
                <SegmentedControl
                  options={teamTabs.map((t) => ({ label: t, value: t }))}
                  value={activeTab}
                  onChange={handleTabChange}
                  className="max-w-full overflow-x-auto"
                />
              </div>
              {/* Mobile / tablet portrait: dropdown */}
              <div className="md:hidden">
                <Select value={teamDropdown} onValueChange={handleDropdownChange}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:w-[200px]">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamTabs.map((team) => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Calendar className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
              {dateLabel}
            </Button>

            {showOrgReports && (
              <Button
                className="h-10 rounded-xl bg-blue-600 text-sm text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={handleExport}
                disabled={exportReports.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}

            {showOrgReports && (
              <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 flex-shrink-0 rounded-xl border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 p-0 text-[10px] text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* KPI strip */}
        <div
          className={cn(
            "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4",
            isFetching && "opacity-70"
          )}
        >
          {kpiCards.map((kpi, i) => (
            <KpiCard key={kpi.label} {...kpi} index={i} />
          ))}
        </div>

        {/* Analytics: performance table anchors the row, charts stack alongside */}
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            showOrgReports ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"
          )}
        >
          <div className={showOrgReports ? "md:col-span-2 lg:col-span-2" : ""}>
            <TeamPerformanceTable data={data.teamPerformance} />
          </div>
          <div className="space-y-4">
            <TaskStatusDonut data={data.taskStatus.items} total={data.taskStatus.total} />
            {showOrgReports && <TasksByTeamChart data={data.teamTasks} />}
          </div>
        </div>

        {/* Customer feedback */}
        {data.feedback && (
          <div className="space-y-4">
            <Divider />
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Customer Feedback
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-1">
                <UserFeedbackTable data={data.feedback.userPerformance} showTeam={showOrgReports} />
              </div>
              <FeedbackList title="Positive Feedback" items={data.feedback.positive} variant="positive" />
              <FeedbackList title="Negative Feedback" items={data.feedback.negative} variant="negative" />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Completion Rate = (Completed Tasks / Assigned Tasks) × 100
        </p>
      </div>
    </DashboardShell>
  );
}