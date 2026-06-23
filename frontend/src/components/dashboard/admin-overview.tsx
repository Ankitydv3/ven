"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { fetchDashboard } from "@/services/dashboard";
import type { DashboardResponse } from "@/lib/types";
import { StatusCards } from "./status-cards";
import { DashboardCharts } from "./dashboard-charts";
import { Badge } from "@/components/ui/badge";

/* ─── Skeleton ─────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/[0.04] ${className}`}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent"
        animate={{ translateX: ["−100%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-36" />
        ))}
      </div>
      <Shimmer className="h-[360px]" />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Shimmer className="h-[360px]" />
        <Shimmer className="h-[360px]" />
      </div>
    </div>
  );
}

/* ─── Activity item ─────────────────────────────────────────────── */
interface ActivityItem {
  complaintId: string;
  status: string;
  assignedTeam?: string | null;
  updatedAt: string;
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const statusColor: Record<string, string> = {
    Completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "In Progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Assigned: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Declined: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  const color = statusColor[item.status] ?? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/[0.06] dark:text-white/60";

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className="group flex items-start gap-3 rounded-xl border border-slate-100 dark:border-white/[0.05] bg-slate-50/60 dark:bg-white/[0.02] px-4 py-3.5 hover:bg-blue-50 dark:hover:bg-blue-500/[0.06] transition-colors duration-200"
    >
      <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{item.complaintId}</p>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${color}`}>
            {item.status}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50 truncate">
          {item.assignedTeam ?? "Unassigned"}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-white/30 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(item.updatedAt).toLocaleString()}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-white/20 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
    </motion.div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export function AdminOverview() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetchDashboard();
      setData(response);
      setLastUpdated(new Date());
      setOnline(true);
    } catch (error) {
      setOnline(false);
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading || !data) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30">
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-none">Overview</h2>
            {lastUpdated && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${online ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-500"}`}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? "Live" : "Offline"}
          </span>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Status cards */}
      <StatusCards data={data} />

      {/* Charts + Activity feed */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <DashboardCharts data={data} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0A0F1E] overflow-hidden"
        >
          {/* Card header */}
          <div className="border-b border-slate-100 dark:border-white/[0.06] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500">Live Feed</p>
                <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight">Recent Activity</h3>
              </div>
            </div>
            <Badge className="rounded-full border-0 bg-blue-500/10 text-blue-500 text-[11px] font-semibold">
              {data.recentActivity.length} events
            </Badge>
          </div>

          {/* Activity list */}
          <div className="p-4 space-y-2.5 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
            <AnimatePresence>
              {data.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                    <Activity className="h-5 w-5 text-slate-300 dark:text-white/20" />
                  </div>
                  <p className="font-semibold text-slate-600 dark:text-white/60 text-sm">No recent activity</p>
                  <p className="text-xs text-slate-400 dark:text-white/30">Updates appear here in real time.</p>
                </div>
              ) : (
                data.recentActivity.map((item, i) => (
                  <ActivityRow key={item.complaintId} item={item} index={i} />
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}