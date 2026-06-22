"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  Calendar,
  Download,
  SlidersHorizontal,
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
    const { summary } = data;
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
    ];
  }, [data]);

  const handleExport = useCallback(() => {
    exportReports.mutate(filters);
  }, [exportReports, filters]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "All Teams") setTeamDropdown(tab);
    else setTeamDropdown("All Teams");
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
      <div className="space-y-6">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] text-[#94A3B8] backdrop-blur-md hover:bg-[rgba(59,130,246,0.1)] hover:text-white dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.6)]"
            >
              <Calendar className="mr-2 h-4 w-4 text-[#3B82F6]" />
              <span className="text-sm">{dateLabel}</span>
            </Button>

            {showOrgReports && (
              <Button
                className="h-10 rounded-xl bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/25 hover:bg-[#2563EB]"
                onClick={handleExport}
                disabled={exportReports.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            )}

            {showOrgReports && (
              <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 rounded-xl border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] text-[#94A3B8] backdrop-blur-md hover:bg-[rgba(59,130,246,0.1)] hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] p-0 text-[10px] text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2",
            isFetching && "opacity-80"
          )}
        >
          {kpiCards.map((kpi, i) => (
            <KpiCard key={kpi.label} {...kpi} index={i} />
          ))}
        </div>

        {/* Team Tabs */}
        {showOrgReports && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-[rgba(59,130,246,0.15)] pb-px">
            {teamTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors duration-300",
                  activeTab === tab
                    ? "text-[#3B82F6]"
                    : "text-[#64748B] hover:text-[#94A3B8]"
                )}
              >
                {tab}
                <AnimatePresence>
                  {activeTab === tab && (
                    <motion.span
                      layoutId="reports-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          <Select value={teamDropdown} onValueChange={handleDropdownChange}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] text-[#94A3B8] backdrop-blur-md">
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
        )}

        {/* Row 1 */}
        <div
          className={cn(
            "grid grid-cols-1 gap-4 md:grid-cols-2",
            showOrgReports ? "xl:grid-cols-3" : "xl:grid-cols-2"
          )}
        >
          <div className="md:col-span-2 xl:col-span-1">
            <TeamPerformanceTable data={data.teamPerformance} />
          </div>
          <TaskStatusDonut data={data.taskStatus.items} total={data.taskStatus.total} />
          {showOrgReports && <TasksByTeamChart data={data.teamTasks} />}
        </div>

        <p className="text-center text-xs text-[#64748B]">
          Completion Rate = (Completed Tasks / Assigned Tasks) × 100
        </p>
      </div>
    </DashboardShell>
  );
}
