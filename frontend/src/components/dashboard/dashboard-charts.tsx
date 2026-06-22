"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardResponse } from "@/lib/types";

const pieColors = [
  "#F59E0B", // Amber - vibrant orange
  "#10B981", // Emerald - vibrant green  
  "#3B82F6", // Blue - vibrant blue
  "#8B5CF6", // Violet - vibrant purple
  "#EF4444", // Red - vibrant red
  "#EC4899"  // Pink - vibrant pink
];
const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(79,155,140,0.15)",
  background: "rgba(255,255,255,0.95)",
  fontSize: "13px",
  boxShadow: "0 8px 24px -8px rgba(4,52,44,0.15)"
};

export function DashboardCharts({ data }: { data: DashboardResponse }) {
  const scope = data.scope;
  const statusData = data.statusDistribution ?? [];

  const teamChartTitle =
    scope?.kind === "personal"
      ? "My completed tasks"
      : scope?.kind === "team"
        ? `${scope.label} completed tasks`
        : "Complaints resolved by team";

  const teamChartDescription =
    scope?.kind === "personal"
      ? "Tasks you have completed."
      : scope?.kind === "team"
        ? "Completed tasks for your team."
        : "Resolved count across support teams.";

  const statusChartTitle =
    scope?.kind === "personal" ? "My task status mix" : "Task status distribution";

  const trendChartTitle =
    scope?.kind === "personal"
      ? "My complaint activity"
      : scope?.kind === "team"
        ? "Team complaint trends"
        : "Monthly complaint trends";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="xl:col-span-2 border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">team performance</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              {teamChartTitle}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              {teamChartDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.teamStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" opacity={0.5} vertical={false} />
              <XAxis dataKey="team" stroke="currentColor" className="text-slate-400 dark:text-white/40" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} stroke="currentColor" className="text-slate-400 dark:text-white/40" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(79,155,140,0.06)" }} />
              <Bar dataKey="completed" radius={[10, 10, 0, 0]} fill="#4F9B8C" maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">distribution</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              {statusChartTitle}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              Share of tasks by current status.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={100}
                paddingAngle={2}
                cornerRadius={6}
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">trends</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              {trendChartTitle}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              Complaints received month by month.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyComplaints}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" opacity={0.5} vertical={false} />
              <XAxis dataKey="month" stroke="currentColor" className="text-slate-400 dark:text-white/40" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} stroke="currentColor" className="text-slate-400 dark:text-white/40" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="complaints" stroke="#EF9F27" strokeWidth={3} dot={{ r: 4, fill: "#EF9F27", strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}