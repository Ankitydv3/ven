"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ListTodo,
  Clock,
  Package,
  CreditCard,
  Lock,
  Droplets,
  Move,
  AlignCenter,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  Zap,
  RefreshCw,
  Calendar,
  Play,
  Eye,
  Users, // Added
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // ← ADD THIS
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getComplaintDetailsPath,
  getMyTasksPath,
  navigateToComplaint,
  navigateToMaterialRequest,
  navigateToTask,
} from "@/lib/record-navigation";
import { useSession } from "@/hooks/use-session";
import { readUser } from "@/lib/storage";
import { fetchDashboardPage } from "@/services/dashboard";
import { fetchComplaints, startComplaint } from "@/services/complaints";
import { fetchTasks, patchTaskStatus } from "@/services/task.service";
import { fetchOrders } from "@/services/orders";
import { materialStatusLabel, getMaterialStatusBadgeClass } from "@/services/material-requests";
import type { DashboardPageData, DashboardPendingAction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/task-constants";
import type { Task } from "@/lib/task.types";
  /* ═══════════════════════════════════════════════════════
    DESIGN TOKENS
  ═══════════════════════════════════════════════════════ */
  const ACCENT = "#85B7EB";          // teal brand
  const ACCENT2 = "#378ADD";
  const SURFACE = "rgba(255,255,255,0.035)";
  const BORDER = "rgba(133,183,235,0.10)";
  const GLOW = "rgba(133,183,235,0.18)";

  const tooltipStyle = {
    borderRadius: "14px",
    border: `1px solid ${BORDER}`,
    background: "#060f1a",
    color: "#e2e8f0",
    fontSize: "12px",
    boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px ${BORDER}`,
    padding: "10px 14px",
  };

  /* ═══════════════════════════════════════════════════════
    COLOR MAPS
  ═══════════════════════════════════════════════════════ */
  const KPI_COLORS = {
    orders:     { gradient: ["#3B82F6","#1D4ED8"], glow: "rgba(59,130,246,0.30)", text: "text-blue-400" },
    received:   { gradient: ["#A855F7","#7C3AED"], glow: "rgba(168,85,247,0.30)", text: "text-purple-400" },
    resolved:   { gradient: ["#22C55E","#15803D"], glow: "rgba(34,197,94,0.30)",  text: "text-emerald-400" },
    unresolved: { gradient: ["#F97316","#C2410C"], glow: "rgba(249,115,22,0.30)", text: "text-orange-400" },
    paid:       { gradient: ["#85B7EB","#378ADD"], glow: `${GLOW}`,              text: "text-blue-300" },
  };

  const REASON_COLORS: Record<string, string> = {
    Delayed:                  "#F97316",
    "Material Unavailability":"#EF4444",
    "Payment Pending":        "#EAB308",
    "Locking issue":          "#3B82F6",
    "Leakage issue":          "#06B6D4",
    "Difficulty in moving":   "#F97316",
    "Alignment issue":        "#A855F7",
    Others:                   "#64748B",
    Resolved:                 "#22C55E",
  };

  const REASON_ICONS: Record<string, ComponentType<{ className?: string }>> = {
    Delayed:                  Clock,
    "Material Unavailability":Package,
    "Payment Pending":        CreditCard,
    "Locking issue":          Lock,
    "Leakage issue":          Droplets,
    "Difficulty in moving":   Move,
    "Alignment issue":        AlignCenter,
    Others:                   MoreHorizontal,
  };

  function taskBadge(status: string) {
    return statusBadgeVariant[status] ?? "default";
  }

  function TeamBadge({ name }: { name: string }) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-inset ring-blue-500/20">
        <Users className="h-3 w-3" />
        {name}
      </span>
    );
  }

  /* ═══════════════════════════════════════════════════════
    FADE-UP VARIANTS
  ═══════════════════════════════════════════════════════ */
  const fadeUp = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  };

  const stagger = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  /* ═══════════════════════════════════════════════════════
    GLASS CARD
  ═══════════════════════════════════════════════════════ */
  function GlassCard({
    children,
    className,
    glow,
  }: {
    children: ReactNode;
    className?: string;
    glow?: string;
  }) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border backdrop-blur-sm overflow-hidden",
          className
        )}
        style={{
          background: SURFACE,
          borderColor: BORDER,
          boxShadow: glow
            ? `0 0 40px ${glow}, 0 1px 0 rgba(255,255,255,0.04) inset`
            : `0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.24)`,
        }}
      >
        {/* subtle top-edge shimmer */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(133,183,235,0.35),transparent)" }}
        />
        {children}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
    SECTION LABEL
  ═══════════════════════════════════════════════════════ */
  function SectionLabel({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
    return (
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
          {eyebrow}
        </p>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
    KPI CARD — animated gradient border + glow
  ═══════════════════════════════════════════════════════ */
  function KpiCard({
    icon: Icon,
    label,
    value,
    delta,
    positive,
    color,
    onClick,
  }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: number;
    delta: string;
    positive: boolean;
    color: { gradient: string[]; glow: string; text: string };
    onClick?: () => void;
  }) {
    return (
      <motion.div variants={fadeUp} onClick={onClick}>
    <GlassCard
      glow={color.glow}
      className={cn(
        "relative p-4 lg:p-5 group",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      {/* Icon + Label */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color.gradient[0]}, ${color.gradient[1]})`,
            boxShadow: `0 4px 20px ${color.glow}`,
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        <div>
          <p className="text-3xl font-bold tracking-tight text-white">
        {value.toLocaleString()}
      </p>
        
        </div>
      </div>

      {/* Value */}
      <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-400">
            Monitor and track performance
          </p>

      {/* Delta */}
      <div className="mt-3 flex items-center gap-1.5">
        {positive ? (
          <TrendingUp className={cn("h-3.5 w-3.5", color.text)} />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
        )}

        <span
          className={cn(
            "text-xs font-semibold",
            positive ? color.text : "text-red-400"
          )}
        >
          {delta}
        </span>

        <span className="text-xs text-slate-500">
          vs last month
        </span>
      </div>

      {/* Hover line */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl"
        style={{
          background: `linear-gradient(90deg,${color.gradient[0]},${color.gradient[1]})`,
        }}
      />
    </GlassCard>
  </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════
    LOADING STATE
  ═══════════════════════════════════════════════════════ */
  function LoadingState() {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-2xl" style={{ background: SURFACE }} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-[300px] rounded-2xl col-span-2" style={{ background: SURFACE }} />
          <div className="h-[300px] rounded-2xl" style={{ background: SURFACE }} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[260px] rounded-2xl" style={{ background: SURFACE }} />
          <div className="h-[260px] rounded-2xl" style={{ background: SURFACE }} />
        </div>
      </div>
    );
  }



  /* ═══════════════════════════════════════════════════════
    DETAILS MODAL
  ═══════════════════════════════════════════════════════ */
  function KpiDetailsModal({
    isOpen,
    onClose,
    title,
    type,
    filters,
    role,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: "complaint" | "task" | "order";
    filters: any;
    role: "admin" | "team" | "store";
  }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { data, isLoading } = useQuery<{ items: any[]; total: number; page: number; limit: number }>({
      queryKey: ["dashboard-details", type, filters],
      queryFn: () => {
        if (type === "complaint") return fetchComplaints(filters);
        if (type === "task") return fetchTasks(filters);
        return fetchOrders(filters);
      },
      enabled: isOpen,
    });

    const items = data?.items ?? [];

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-[#0b1424] border-white/10 text-white p-0">
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
                <p className="text-slate-400 font-medium">No records found matching this category.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item: any) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05] transition-all group cursor-pointer"
                    onClick={() => {
                      if (type === "complaint") {
                        navigateToComplaint(router, role, item);
                      } else if (type === "task") {
                        navigateToTask(router, role, item);
                      } else {
                        router.push(`${role === "admin" ? "/admin" : "/team"}/orders?q=${encodeURIComponent(item.orderId)}`);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-blue-400/80 mb-0.5">
                          {type === "complaint" ? item.complaintId : type === "task" ? item.taskId : item.orderId}
                        </p>
                        <h4 className="text-sm font-bold text-white truncate">
                          {type === "complaint" ? item.clientName : type === "task" ? item.title : item.customerName}
                        </h4>
                      </div>
                      <Badge
                        className="shrink-0"
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

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed break-words">
                      {type === "complaint"
                        ? item.description
                        : type === "task"
                          ? item.description || "No description provided."
                          : `${item.materialType} · ${item.city}`}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="break-words line-clamp-1 group-hover:line-clamp-none transition-all">
                              {item.location}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {role === "team" && type === "task" && item.status === "Pending" && (
                          <button
                            onClick={async () => {
                              try {
                                await patchTaskStatus(item._id, "In Progress");
                                toast.success("Task started");
                                await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                                await queryClient.invalidateQueries({ queryKey: ["dashboard-details"] });
                                navigateToTask(router, role, item);
                              } catch (err) {
                                toast.error("Failed to Update Task");
                              }
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20 transition-all"
                          >
                            <Play className="h-3 w-3" />
                            Update Task
                          </button>
                        )}
                        {role === "team" && type === "complaint" && item.status === "Assigned" && (
                          <button
                            onClick={async () => {
                              try {
                                await startComplaint(item._id);
                                toast.success("Complaint work started");
                                await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                                await queryClient.invalidateQueries({ queryKey: ["dashboard-details"] });
                              } catch (err) {
                                toast.error("Failed to start work");
                              }
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                          >
                            <Play className="h-3 w-3" />
                            Start Work
                          </button>
                        )}
                      </div>
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

  /* ═══════════════════════════════════════════════════════
    DONUT — complaints overview
  ═══════════════════════════════════════════════════════ */
  function ComplaintsDonut({ data, onSliceClick }: { data: DashboardPageData; onSliceClick?: (name: string) => void }) {
    const slices = useMemo(() => {
      return [
        { name: "Resolved", value: data.summary.complaintsResolved },
        ...data.unresolvedReasons,
      ];
    }, [data]);

    const total = slices.reduce((s, i) => s + i.value, 0);

    return (
      <GlassCard className="p-5 lg:p-6 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-0.5" style={{ color: ACCENT }}>
          Breakdown
        </p>
        <h3 className="text-base font-bold text-white mb-5">Complaints Overview</h3>

        <div className="relative mx-auto h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <defs>
                <filter id="glow-pie">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={3}
                cornerRadius={5}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                onClick={(slice) => {
                  if (slice && slice.name) {
                    onSliceClick?.(slice.name);
                  }
                }}
                className="cursor-pointer"
              >
                {slices.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={REASON_COLORS[entry.name] ?? "#94A3B8"}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{total}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Total</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {slices.map((s) => {
            const pct = total ? ((s.value / total) * 100).toFixed(1) : "0.0";
            const color = REASON_COLORS[s.name] ?? "#94A3B8";
            return (
              <div
                key={s.name}
                className="flex items-center gap-2 text-sm cursor-pointer group"
                onClick={() => onSliceClick?.(s.name)}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-400 truncate flex-1 text-xs group-hover:text-slate-200 transition-colors">{s.name}</span>
                <span className="text-white font-semibold text-xs">{s.value}</span>
                <span className="text-slate-500 text-xs w-11 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </GlassCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
    BAR CHART — categories
  ═══════════════════════════════════════════════════════ */
  function CategoriesBar({ data, onBarClick }: { data: DashboardPageData["categories"]; onBarClick?: (name: string) => void }) {
    const barColors = ["#85B7EB","#A855F7","#3B82F6","#F97316","#22C55E"];

    const enriched = (data ?? []).map((c, i) => ({ ...c, fill: barColors[i % barColors.length] }));

    return (
      <GlassCard className="p-5 lg:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-0.5" style={{ color: ACCENT }}>
          Distribution
        </p>
        <h3 className="text-base font-bold text-white mb-5">Top Complaint Categories</h3>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={enriched}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
            barCategoryGap="30%"
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar
              dataKey="value"
              name="Complaints"
              radius={[0, 6, 6, 0]}
              onClick={(data) => {
                if (data && data.name) {
                  onBarClick?.(data.name);
                }
              }}
            >
              {enriched.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
    COMPLAINTS BY REASON — pill toggle + stat cards + donut
  ═══════════════════════════════════════════════════════ */
  function ComplaintsByReason({
    unresolved,
    resolved,
    onItemClick,
  }: {
    unresolved: DashboardPageData["unresolvedReasons"];
    resolved: DashboardPageData["resolvedReasons"];
    onItemClick?: (name: string, view: "unresolved" | "resolved") => void;
  }) {
    const [view, setView] = useState<"unresolved" | "resolved">("unresolved");
    const data = view === "unresolved" ? (unresolved ?? []) : (resolved ?? []);
    const total = data.reduce((s, i) => s + i.value, 0);

    return (
      <GlassCard className="p-5 lg:p-6">
        {/* header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>
              Analysis
            </p>
            <h3 className="text-base font-bold text-white">
              Complaints — By Reason
            </h3>
          </div>

          <div className="flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
            {(["unresolved", "resolved"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                  view === v ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {total > 0 ? (
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                {/* stat cards */}
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  {data.map((item) => {
                    const color = REASON_COLORS[item.name] ?? "#64748B";
                    const Icon = REASON_ICONS[item.name] ?? AlertTriangle;
                    const pct = ((item.value / total) * 100).toFixed(1);

                    return (
                      <div
                        key={item.name}
                        className="rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={() => onItemClick?.(item.name, view)}
                        style={{
                          background: `${color}10`,
                          border: `1px solid ${color}25`,
                        }}
                      >
                        <div
                          className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            background: `${color}20`,
                            color,
                            boxShadow: `0 0 18px ${color}30`,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-xs text-slate-400 mb-1 truncate">{item.name}</p>
                        <p className="text-2xl font-bold text-white leading-none">{item.value}</p>
                        <p className="mt-1 text-[11px] font-medium" style={{ color }}>
                          {pct}% of {view}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* mini donut */}
                <div className="flex shrink-0 flex-col items-center gap-5 xl:w-[260px]">
                  <div className="relative h-[160px] w-[160px]">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="value"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={2}
                          stroke="none"
                          onClick={(slice) => {
                            if (slice && slice.name) {
                              onItemClick?.(slice.name, view);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {data.map((item) => (
                            <Cell
                              key={item.name}
                              fill={REASON_COLORS[item.name] ?? "#64748B"}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-white">{total}</p>
                      <p className="text-[10px] text-slate-500">Total</p>
                    </div>
                  </div>

                  <div className="w-full space-y-2">
                    {data.map((item) => {
                      const color = REASON_COLORS[item.name] ?? "#64748B";
                      const pct = ((item.value / total) * 100).toFixed(1);
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-xs cursor-pointer group"
                          onClick={() => onItemClick?.(item.name, view)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-slate-400 truncate group-hover:text-slate-200 transition-colors">{item.name}</span>
                          </div>
                          <span className="text-slate-300 font-medium ml-2 shrink-0">
                            {item.value} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No unresolved complaints to display right now.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
    TASK PROGRESS — visual ring rows
  ═══════════════════════════════════════════════════════ */
  function TaskProgressPanel({ stats, onRowClick }: { stats: DashboardPageData["taskStats"]; onRowClick?: (label: string) => void }) {
    const rows = [
      { label: "Completed",  value: stats.completed,  total: stats.totalTasks, color: "#22C55E" },
      { label: "In Progress",value: stats.inProgress, total: stats.totalTasks, color: ACCENT },
      { label: "Pending",    value: stats.pending,    total: stats.totalTasks, color: "#F97316" },
      { label: "Overdue",    value: stats.overdue,    total: stats.totalTasks, color: "#EF4444" },
      { label: "Need Material", value: stats.needMaterial ?? 0, total: stats.totalTasks, color: "#A855F7" },
      { label: "Need Re-visit", value: stats.needRevisit ?? 0, total: stats.totalTasks, color: "#3B82F6" },
    ];

    return (
      <GlassCard className="p-5 lg:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-0.5" style={{ color: ACCENT }}>
          Productivity
        </p>
        <h3 className="text-base font-bold text-white mb-2">Task Progress</h3>

        {/* completion rate big number */}
        <div className="mb-6 flex items-end gap-2">
          <span className="text-4xl font-bold text-white">{stats.completionRate ?? 0}%</span>
          <span className="mb-1 text-sm text-slate-400">completion rate</span>
        </div>

        <div className="space-y-4">
          {rows.map((r) => {
            const pct = r.total > 0 ? (r.value / r.total) * 100 : 0;
            return (
              <div key={r.label} className="cursor-pointer group" onClick={() => onRowClick?.(r.label)}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{r.label}</span>
                  <span className="font-semibold text-white">{r.value}</span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}80` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t cursor-pointer group" style={{ borderColor: BORDER }} onClick={() => onRowClick?.("Total Tasks")}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="group-hover:text-slate-200 transition-colors">Total Tasks</span>
            <span className="text-white font-bold text-sm">{stats.totalTasks}</span>
          </div>
        </div>
      </GlassCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
    SUMMARY TABLES
  ═══════════════════════════════════════════════════════ */
  function SummaryTables({ data, role }: { data: DashboardPageData; role: "admin" | "team" | "store" }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const user = readUser();
    const isFullAdmin = user?.role === "admin" || user?.role === "super_admin";
    const isSubAdmin = user?.role === "sub_admin";
    const isStoreManager = user?.role === "store_manager" || role === "store";
    const isUnifiedDashboard = isFullAdmin || isSubAdmin || isStoreManager;
    const showSiteVisits = !isSubAdmin;
    const showMaterialTasks = isUnifiedDashboard || (data.pendingActions?.length ?? 0) > 0;
    const showRecentComplaints = isFullAdmin || role === "team";

    const handleOpenMaterialRequest = (item: DashboardPendingAction) => {
      navigateToMaterialRequest(router, role, { _id: item._id, requestId: item.requestId }, { action: "review" });
    };

    const handleStartTask = async (task: Task) => {
      try {
        await patchTaskStatus(task._id, "In Progress");
        toast.success("Task started");
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        navigateToTask(router, role, task);
      } catch (err) {
        toast.error("Failed to Update Task");
      }
    };

    const handleStartComplaint = async (complaintId: string) => {
      try {
        await startComplaint(complaintId);
        toast.success("Complaint work started");
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } catch (err) {
        toast.error("Failed to start work");
      }
    };

    return (
      <div className={cn("grid gap-6", showSiteVisits ? "xl:grid-cols-2" : "grid-cols-1")}>
        {/* Site Visits — hidden for sub-admin (only their approval queue below) */}
        {showSiteVisits && (
        <GlassCard className="p-5 lg:p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                Today&apos;s Schedule
              </p>
              <h3 className="text-lg font-bold text-white">Site Visits</h3>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            >
              {data.todaysSiteVisits?.length ?? 0} Tasks
            </span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <Table className="bg-transparent min-w-[600px]">
              <TableElement>
                <THead>
                  <tr className="border-b border-white/5">
                    <TH className="w-[100px] py-4">Task ID</TH>
                    <TH>Customer</TH>
                    <TH>Location</TH>
                    <TH className="w-[120px]">Status</TH>
                    <TH className="w-[80px] text-right">Action</TH>
                  </tr>
                </THead>
                <tbody className="divide-y divide-white/[0.02]">
                  {(data.todaysSiteVisits?.length ?? 0) === 0 ? (
                    <TR>
                      <TD colSpan={5} className="py-12 text-center text-slate-500 text-sm italic">
                        No site visits scheduled today.
                      </TD>
                    </TR>
                  ) : (
                    (data.todaysSiteVisits ?? []).map((visit: Task) => (
                      <TR
                        key={visit._id}
                        className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
                        onClick={() => navigateToTask(router, role, visit)}
                      >
                        <TD className="py-4 font-mono text-[11px] font-bold text-blue-400">
                          <Link
                            href={
                              role === "team"
                                ? getMyTasksPath(role, visit)
                                : visit.complaintId
                                  ? getComplaintDetailsPath(role, visit.complaintId)
                                  : `${role === "admin" ? "/admin" : "/team"}/schedule?q=${visit.taskId}`
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline hover:text-blue-300 transition-colors"
                          >
                            {visit.taskId}
                          </Link>
                        </TD>
                        <TD className="py-4 font-medium text-slate-200">{visit.complaint?.clientName ?? visit.title}</TD>
                        <TD className="py-4 max-w-[150px] truncate text-slate-400 text-xs">
                          {visit.complaint?.location ?? "—"}
                        </TD>
                        <TD className="py-4">
                          <Badge variant={taskBadge(visit.status)} className="font-bold">{visit.status}</Badge>
                        </TD>
                        <TD className="py-4 text-right">
                          <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-500 hover:bg-white/10 hover:text-white"
                              onClick={() => navigateToTask(router, role, visit)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {role === "team" && visit.status === "Pending" && (
                              <button
                                onClick={() => void handleStartTask(visit)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20"
                              >
                                <Play className="h-3 w-3" />
                                Start
                              </button>
                            )}
                          </div>
                        </TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </TableElement>
            </Table>
          </div>
        </GlassCard>
        )}

        {/* Tasks to do / Recent complaints */}
        <GlassCard className="p-5 lg:p-6 shadow-xl">
          {showMaterialTasks && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                    Action Required
                  </p>
                  <h3 className="text-lg font-bold text-white">
                    {isSubAdmin && user?.subAdminType === "accountant"
                      ? "Payment & Material Tasks"
                      : isSubAdmin
                        ? "Material & Service Tasks"
                        : "Tasks to Do"}
                  </h3>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                >
                  {data.pendingActions?.length ?? 0} Pending
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <Table className="bg-transparent min-w-[650px]">
                  <TableElement>
                    <THead>
                      <tr className="border-b border-white/5">
                        <TH className="w-[110px] py-4">Request ID</TH>
                        <TH>Material</TH>
                        <TH>Complaint</TH>
                        <TH className="w-[140px]">Status</TH>
                        <TH className="w-[60px] text-right">Action</TH>
                      </tr>
                    </THead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {(data.pendingActions?.length ?? 0) === 0 ? (
                        <TR>
                          <TD colSpan={5} className="py-10 text-center text-slate-500 text-sm italic">
                            No material requests waiting for your action.
                          </TD>
                        </TR>
                      ) : (
                        (data.pendingActions ?? []).map((item) => (
                          <TR
                            key={item._id}
                            className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
                            onClick={() => handleOpenMaterialRequest(item)}
                          >
                            <TD className="py-4 font-mono text-[11px] font-bold text-blue-400">{item.requestId}</TD>
                            <TD className="py-4">
                              <p className="font-medium text-slate-200">{item.materialName}</p>
                              <p className="text-xs text-slate-500">
                                {item.quantity} {item.unit} · {item.requestedBy}
                              </p>
                            </TD>
                            <TD className="py-4 text-slate-300 text-sm">
                              {item.complaintId ? (
                                <span>
                                  {item.complaintId}
                                  {item.clientName ? ` · ${item.clientName}` : ""}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TD>
                            <TD className="py-4">
                              <Badge className={cn("font-bold", getMaterialStatusBadgeClass(item.status))}>
                                {materialStatusLabel[item.status] ?? item.status}
                              </Badge>
                            </TD>
                            <TD className="py-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-500 hover:bg-white/10 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenMaterialRequest(item);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TD>
                          </TR>
                        ))
                      )}
                    </tbody>
                  </TableElement>
                </Table>
              </div>
            </>
          )}

          {showRecentComplaints && (
            <>
              <div className={cn("mb-6 flex items-center justify-between", showMaterialTasks && "mt-8 border-t border-white/5 pt-8")}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                    Latest Activity
                  </p>
                  <h3 className="text-lg font-bold text-white">Recent Complaints</h3>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                >
                  {data.recentComplaints?.length ?? 0} Entries
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <Table className="bg-transparent min-w-[650px]">
                  <TableElement>
                    <THead>
                      <tr className="border-b border-white/5">
                        <TH className="w-[100px] py-4">ID</TH>
                        <TH>Customer</TH>
                        <TH className="w-[120px]">Status</TH>
                        <TH className="w-[100px]">Date</TH>
                        <TH className="w-[140px]">Assigned Team</TH>
                        <TH className="w-[60px] text-right">Action</TH>
                      </tr>
                    </THead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {(data.recentComplaints?.length ?? 0) === 0 ? (
                        <TR>
                          <TD colSpan={6} className="py-12 text-center text-slate-500 text-sm italic">
                            No recent complaints found.
                          </TD>
                        </TR>
                      ) : (
                        (data.recentComplaints ?? []).map((c) => (
                          <TR
                            key={c._id ?? c.complaintId}
                            className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
                            onClick={() => navigateToComplaint(router, role, c)}
                          >
                            <TD className="py-4 font-mono text-[11px] font-bold text-blue-400">
                              <Link
                                href={getComplaintDetailsPath(role, c.complaintId)}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline hover:text-blue-300 transition-colors"
                              >
                                {c.complaintId}
                              </Link>
                            </TD>
                            <TD className="py-4 font-medium text-slate-200">{c.clientName ?? "—"}</TD>
                            <TD className="py-4">
                              <Badge
                                className="font-bold"
                                variant={
                                  c.status === "Completed" || c.status === "Resolved"
                                    ? "success"
                                    : c.status === "In Progress"
                                    ? "info"
                                    : "warning"
                                }
                              >
                                {c.status}
                              </Badge>
                            </TD>
                            <TD className="py-4 text-slate-400 text-xs">
                              {new Date(c.updatedAt).toLocaleDateString()}
                            </TD>
                            <TD className="py-4">
                              {c.assignedTeam ? (
                                <TeamBadge name={c.assignedTeam} />
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Not Assigned</span>
                              )}
                            </TD>
                            <TD className="py-4 text-right">
                               <div className="flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                 <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-slate-500 hover:bg-white/10 hover:text-white"
                                    onClick={() => navigateToComplaint(router, role, c)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {role === "team" && c.status === "Assigned" && (
                                    <button
                                      onClick={() => handleStartComplaint(c.complaintId)}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
                                    >
                                      <Play className="h-3 w-3" />
                                      Start
                                    </button>
                                  )}
                              </div>
                            </TD>
                          </TR>
                        ))
                      )}
                    </tbody>
                  </TableElement>
                </Table>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
    PAGE ROOT
  ═══════════════════════════════════════════════════════ */
  export function DashboardPage({ role }: { role: "admin" | "team" | "store" }) {
    const { ready } = useSession(role);
    const user = readUser();
    const isFullAdmin = user?.role === "admin" || user?.role === "super_admin";
    const isSubAdmin = user?.role === "sub_admin";
    const isStoreManager = user?.role === "store_manager" || role === "store";
    const activitySubtitle = isSubAdmin
      ? user?.subAdminType === "accountant"
        ? "Payment verifications and material requests waiting for your action"
        : "Material requests and service approvals waiting for your action"
      : isFullAdmin
      ? "Today's site visits, pending material requests, and latest complaints"
      : isStoreManager
        ? "Material requests waiting for your action"
        : "Today's site visits and the latest complaints";

    const activitySection = (data: DashboardPageData) => (
      <motion.div variants={fadeUp}>
        <SectionLabel eyebrow="Activity" title="Recent Activity" subtitle={activitySubtitle} />
        <SummaryTables data={data} role={role} />
      </motion.div>
    );
    const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
      queryKey: ["dashboard", role, user?.role, user?.subAdminType],
      queryFn: () => fetchDashboardPage(role, user?.role),
      staleTime: 15_000,
      refetchInterval: 30_000,
      enabled: ready,
    });

    const [detailModal, setDetailModal] = useState<{
      isOpen: boolean;
      title: string;
      type: "complaint" | "task" | "order";
      filters: any;
    }>({
      isOpen: false,
      title: "",
      type: "complaint",
      filters: {},
    });

    const openDetails = (title: string, type: "complaint" | "task" | "order", filters: any) => {
      setDetailModal({ isOpen: true, title, type, filters });
    };

    const summaryCards = useMemo(
      () => [
        {
          label: "Total Orders",
          value: data?.summary.totalOrders ?? 0,
          delta: "12.5%",
          positive: true,
          icon: ShoppingCart,
          color: KPI_COLORS.orders,
          onClick: () => openDetails("All Orders", "order", {}),
        },
        {
          label: "Complaints Received",
          value: data?.summary.complaintsReceived ?? 0,
          delta: "8.3%",
          positive: true,
          icon: ClipboardList,
          color: KPI_COLORS.received,
          onClick: () => openDetails("All Complaints Received", "complaint", { scope: "all" }),
        },
        {
          label: "Complaints Resolved",
          value: data?.summary.complaintsResolved ?? 0,
          delta: "15.4%",
          positive: true,
          icon: CheckCircle2,
          color: KPI_COLORS.resolved,
          onClick: () => openDetails("Resolved Complaints", "complaint", { displayStatus: "Completed" }),
        },
        {
          label: "Unresolved",
          value: data?.summary.complaintsUnresolved ?? 0,
          delta: "6.5%",
          positive: false,
          icon: AlertTriangle,
          color: KPI_COLORS.unresolved,
          onClick: () => openDetails("Unresolved Complaints", "complaint", { displayStatus: "Unresolved" }),
        },
        {
          label: "Paid Services Done",
          value: data?.summary.paidServicesDone ?? 0,
          delta: "14.2%",
          positive: true,
          icon: Wallet,
          color: KPI_COLORS.paid,
          onClick: () => openDetails("Paid Services Completed", "order", { paid: true, status: "Completed" }),
        },
      ],
      [data]
    );

    const taskCards = useMemo(
      () => [
        {
          label: "Total Tasks",
          value: data?.taskStats.totalTasks ?? 0,
          delta: `${data?.taskStats.completionRate ?? 0}% done`,
          positive: true,
          icon: ListTodo,
          color: KPI_COLORS.received,
          onClick: () => openDetails("All Assigned Tasks", "task", {}),
        },
        {
          label: "Pending Tasks",
          value: data?.taskStats.pending ?? 0,
          delta: "Awaiting start",
          positive: false,
          icon: Clock,
          color: KPI_COLORS.unresolved,
          onClick: () => openDetails("Pending Tasks", "task", { status: "Pending" }),
        },
        {
          label: "In Progress",
          value: data?.taskStats.inProgress ?? 0,
          delta: "Active now",
          positive: true,
          icon: ClipboardList,
          color: KPI_COLORS.orders,
          onClick: () => openDetails("Tasks In Progress", "task", { status: "In Progress" }),
        },
        {
          label: "Completed",
          value: data?.taskStats.completed ?? 0,
          delta: "Finished",
          positive: true,
          icon: CheckCircle2,
          color: KPI_COLORS.resolved,
          onClick: () => openDetails("Completed Tasks", "task", { status: "Completed" }),
        },
        {
          label: "Overdue",
          value: data?.taskStats.overdue ?? 0,
          delta: "Needs attention",
          positive: false,
          icon: AlertTriangle,
          color: KPI_COLORS.unresolved,
          onClick: () => openDetails("Overdue Tasks", "task", { status: "Overdue" }),
        },
      ],
      [data]
    );

    if (!ready) return null;

    return (
      <DashboardShell
        role={role}
        title="Dashboard"
        subtitle="Real-time operational metrics and performance overview."
      >
        <KpiDetailsModal
          {...detailModal}
          role={role}
          onClose={() => setDetailModal((p) => ({ ...p, isOpen: false }))}
        />
        {/* ── Page header ── */}
       

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="font-semibold text-red-300">Failed to load dashboard</p>
            <p className="mt-2 text-sm text-slate-400">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <Button className="mt-4" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : !data ? (
          <LoadingState />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-8"
          >
            {!isFullAdmin && data && activitySection(data)}

            {/* ── Section: Complaint Overview KPIs ── */}
            <motion.section variants={fadeUp} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
  <SectionLabel
    eyebrow="Complaints"
    title="Complaint Overview"
    subtitle="Track performance and resolution metrics at a glance"
  />

  <button
    type="button"
    onClick={() => refetch()}
    className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
    style={{ borderColor: BORDER, background: SURFACE }}
  >
    <RefreshCw
      className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
      style={{ color: ACCENT }}
    />
    Refresh
  </button>
</div>
              <motion.div
                variants={stagger}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
              >
                {summaryCards.map((c) => (
                  <KpiCard key={c.label} {...c} />
                ))}
              </motion.div>
              
            </motion.section>

            {/* ── Section: Task Overview KPIs ── */}
            <motion.section variants={fadeUp} className="space-y-4">
              <SectionLabel
                eyebrow="Tasks"
                title="Task Overview"
                subtitle="Monitor team productivity and task completion"
              />
              <motion.div
                variants={stagger}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
              >
                {taskCards.map((c) => (
                  <KpiCard key={c.label} {...c} />
                ))}
              </motion.div>
            </motion.section>

            {/* ── Row: Trend chart + Donut ── */}
            

            {/* ── Row: Categories bar + Task progress ── */}
            <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CategoriesBar
                  data={data.categories}
                  onBarClick={(name) => openDetails(`Category: ${name}`, "complaint", { displayStatus: name })}
                />
              </div>
              <TaskProgressPanel
                stats={data.taskStats}
                onRowClick={(label) => {
                  const statusMap: Record<string, string> = {
                    "Completed": "Completed",
                    "In Progress": "In Progress",
                    "Pending": "Pending",
                    "Overdue": "Overdue",
                    "Need Material": "Need Material",
                    "Need Re-visit": "Need Re-visit",
                  };
                  openDetails(
                    label === "Total Tasks" ? "All Tasks" : `${label} Tasks`,
                    "task",
                    label === "Total Tasks" ? {} : { status: statusMap[label] }
                  );
                }}
              />
            </motion.div>

            {/* ── Reason breakdown toggle ── */}
            <motion.div variants={fadeUp}>
              <ComplaintsByReason
                unresolved={data.unresolvedReasons}
                resolved={data.resolvedReasons}
                onItemClick={(name, view) => {
                  const displayStatus = view === "resolved" ? "Completed" : name;
                  openDetails(`${name} Complaints (${view})`, "complaint", { displayStatus });
                }}
              />
            </motion.div>

            {isFullAdmin && !isSubAdmin && data && activitySection(data)}
          </motion.div>
        )}
      </DashboardShell>
    );
  }