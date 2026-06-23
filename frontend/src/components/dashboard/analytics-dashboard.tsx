"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Loader2,
  Target,
  Users,
  BarChart2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardResponse } from "@/lib/types";
import { DashboardCharts } from "./dashboard-charts";

/* ─── Helpers ─────────────────────────────────────────────────── */
function scopeSubtitle(scope?: DashboardResponse["scope"]) {
  if (scope?.kind === "personal") return `Your performance — ${scope.label}`;
  if (scope?.kind === "team") return `Team performance — ${scope.label}`;
  return "Organization-wide performance";
}

function performanceTitle(scope?: DashboardResponse["scope"]) {
  if (scope?.kind === "personal") return "My task performance";
  if (scope?.kind === "team") return `${scope?.label ?? "Team"} performance`;
  return "Team performance";
}

/* ─── Shimmer skeleton ────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/[0.04] ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/[0.06] to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── KPI card ────────────────────────────────────────────────── */
interface KpiProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: { bg: string; text: string; ring: string; glow: string };
  trend?: string;
  positive?: boolean;
  delay?: number;
}

function KpiCard({ label, value, icon: Icon, color, trend, positive, delay = 0 }: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.18 } }}
      className={`
        group relative overflow-hidden rounded-2xl
        border border-slate-200/80 dark:border-white/[0.07]
        bg-white dark:bg-[#0A0F1E]
        shadow-sm hover:shadow-xl ${color.glow}
        transition-shadow duration-300 p-5 cursor-default
      `}
    >
      {/* Ambient orb */}
      <div className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full ${color.bg} opacity-20 group-hover:opacity-30 transition-opacity duration-500 blur-3xl`} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color.bg} ring-1 ${color.ring}`}>
          <Icon className={`h-5 w-5 ${color.text}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className={`font-bold text-3xl leading-none ${color.text}`}>{value.toLocaleString()}</p>
    </motion.div>
  );
}

/* ─── Team stat card ──────────────────────────────────────────── */
function TeamStatCard({
  team,
  delay,
  isPersonal,
}: {
  team: { team: string; assigned: number; completed: number };
  delay: number;
  isPersonal: boolean;
}) {
  const rate = team.assigned ? Math.round((team.completed / team.assigned) * 100) : 0;
  const pending = Math.max(team.assigned - team.completed, 0);

  const badgeColor =
    rate >= 80
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : rate >= 50
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-rose-500/10 text-rose-500 border-rose-500/20";

  const barColor = rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="group rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0A0F1E] p-5 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="font-bold text-slate-800 dark:text-white text-base leading-none">{team.team}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {isPersonal ? "Your task snapshot" : "Performance snapshot"}
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>{rate}%</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        {[
          { label: "Assigned", val: team.assigned, color: "text-slate-800 dark:text-white" },
          { label: "Done", val: team.completed, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", val: pending, color: "text-rose-600 dark:text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className={`mt-1 font-bold text-lg leading-none ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export function AnalyticsDashboard({
  data,
  isLoading,
}: {
  data: DashboardResponse | null;
  isLoading?: boolean;
}) {
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-44" />)}
        </div>
        <Shimmer className="h-80" />
      </div>
    );
  }

  const scope = data.scope;
  const isPersonal = scope?.kind === "personal";

  const kpis: KpiProps[] = [
    { label: "Total tasks", value: data.totalTasks ?? 0, icon: BarChart2, color: { bg: "bg-blue-500/10", text: "text-blue-500", ring: "ring-blue-500/20", glow: "hover:shadow-blue-500/10" }, trend: "+6.2%", positive: true },
    { label: "In progress", value: data.inProgress ?? 0, icon: Loader2, color: { bg: "bg-violet-500/10", text: "text-violet-500", ring: "ring-violet-500/20", glow: "hover:shadow-violet-500/10" }, trend: "+1.4%", positive: true },
    { label: "Completed", value: data.completed ?? 0, icon: CheckCircle2, color: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20", glow: "hover:shadow-emerald-500/10" }, trend: "+9.1%", positive: true },
    { label: "Overdue", value: data.overdue ?? 0, icon: Zap, color: { bg: "bg-rose-500/10", text: "text-rose-500", ring: "ring-rose-500/20", glow: "hover:shadow-rose-500/10" }, trend: "-2.4%", positive: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30">
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Analytics</p>
            <h2 className="font-bold text-slate-800 dark:text-white text-xl leading-tight">
              {performanceTitle(scope)}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{scopeSubtitle(scope)}</p>
          </div>
        </div>

        {typeof data.completionRate === "number" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-blue-500/20 bg-blue-500/[0.07]"
          >
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {data.completionRate}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">completion rate</span>
          </motion.div>
        )}
      </motion.div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} delay={i * 0.07} />
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Team Breakdown</p>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
      </div>

      {/* Team stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.teamStats.map((team, i) => (
          <TeamStatCard key={team.team} team={team} delay={i * 0.07 + 0.2} isPersonal={isPersonal} />
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts data={data} />
    </div>
  );
}