"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ShoppingCart,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Clock,
  PackageX,
  CreditCard as PaymentIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { fetchDashboardPage } from "@/services/dashboard";
import type { DashboardPageData } from "@/lib/types";

/* ---------------------------------------------------------
   Color tokens — match icon bg, donut slices, and legend dots
   so nothing drifts between components.
--------------------------------------------------------- */
const KPI_COLORS = {
  orders: { bg: "bg-blue-500", text: "text-blue-500", ring: "ring-blue-500/20" },
  received: { bg: "bg-purple-500", text: "text-purple-500", ring: "ring-purple-500/20" },
  resolved: { bg: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-500/20" },
  unresolved: { bg: "bg-amber-600", text: "text-amber-600", ring: "ring-amber-600/20" },
  paid: { bg: "bg-teal-500", text: "text-teal-500", ring: "ring-teal-500/20" },
};

// Unresolved reason colors (Delayed / Material Unavailability / Payment Pending)
const REASON_COLORS: Record<string, string> = {
  Delayed: "#F97316", // orange
  "Material Unavailability": "#EF4444", // red
  "Payment Pending": "#F59E0B", // amber
};
const REASON_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Delayed: Clock,
  "Material Unavailability": PackageX,
  "Payment Pending": PaymentIcon,
};

// Complaints overview slice colors (Resolved / Delayed / Material Unavailability / Payment Pending)
const OVERVIEW_COLORS: Record<string, string> = {
  Resolved: "#22C55E", // green
  Delayed: "#EF4444", // red
  "Material Unavailability": "#F97316", // orange
  "Payment Pending": "#EAB308", // yellow
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "#0F172A",
  color: "#fff",
  fontSize: "12px",
  boxShadow: "0 18px 50px rgba(2, 6, 23, 0.35)",
};

/* ---------------------------------------------------------
   KPI Card
--------------------------------------------------------- */
function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  positive,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  delta: string;
  positive: boolean;
  color: { bg: string; text: string; ring: string };
}) {
  return (
    <Card className="border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
      <CardContent className="">
        <div className="flex items-center gap-4">
  {/* Icon */}
  <div
    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color.bg}`}
  >
    <Icon className="h-7 w-7 text-white" />
  </div>

  {/* Content */}
  <div className="flex flex-col">
    <p className="text-sm font-medium text-slate-300">
      {label}
    </p>

    <p className="text-2xl font-bold leading-none text-white">
      {value.toLocaleString()}
    </p>

    <span
      className={`mt-1 text-sm font-medium ${
        positive
          ? "text-emerald-400"
          : "text-red-400"
      }`}
    >
      {positive ? "↑" : "↓"} {delta}
      <span className="text-slate-400 font-normal">
        {" "}vs last month
      </span>
    </span>
  </div>
</div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------
   Section wrapper
--------------------------------------------------------- */
function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[220px] rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Unresolved Complaints — By Reason (the missing piece)
--------------------------------------------------------- */
function UnresolvedByReason({ data }: { data: DashboardPageData["unresolvedReasons"] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <SectionCard title="Unresolved Complaints – By Reason">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-center">
        {/* mini stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          {data.map((reason) => {
            const Icon = REASON_ICONS[reason.name] ?? AlertTriangle;
            const color = REASON_COLORS[reason.name] ?? "#94A3B8";
            const pct = total ? ((reason.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div
                key={reason.name}
                className="rounded-xl border border-gray-200 dark:border-white/10 p-3"
              >
                <div
                  className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}1A`, color }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{reason.name}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {reason.value}
                </p>
                <p className="text-[11px]" style={{ color }}>
                  {pct}% of unresolved
                </p>
              </div>
            );
          })}
        </div>

        {/* donut + legend */}
        <div className="flex items-center gap-4">
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  cornerRadius={6}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={REASON_COLORS[entry.name] ?? "#94A3B8"}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400">Total Unresolved</span>
            </div>
          </div>
          <div className="space-y-2">
            {data.map((reason) => {
              const pct = total ? ((reason.value / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={reason.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: REASON_COLORS[reason.name] ?? "#94A3B8" }}
                  />
                  <span className="text-gray-700 dark:text-slate-300">{reason.name}</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-white">
                    {reason.value}
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------
   Complaints Overview donut (Resolved + each unresolved reason)
--------------------------------------------------------- */
function ComplaintsOverview({ data }: { data: DashboardPageData }) {
  const slices = useMemo(() => {
    const reasons = data.unresolvedReasons.map((r) => ({
      name: r.name,
      value: r.value,
    }));
    return [
      { name: "Resolved", value: data.summary.complaintsResolved },
      ...reasons,
    ];
  }, [data]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <SectionCard title="Complaints Overview">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-[200px] w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={64}
                outerRadius={94}
                paddingAngle={3}
                cornerRadius={6}
                startAngle={90}
                endAngle={-270}
              >
                {slices.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={OVERVIEW_COLORS[entry.name] ?? "#94A3B8"}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400">Total Complaints</span>
          </div>
        </div>
        <div className="w-full space-y-1.5">
          {slices.map((s) => {
            const pct = total ? ((s.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: OVERVIEW_COLORS[s.name] ?? "#94A3B8" }}
                />
                <span className="text-gray-700 dark:text-slate-300">{s.name}</span>
                <span className="ml-auto font-medium text-gray-900 dark:text-white">{s.value}</span>
                <span className="text-xs text-gray-400 w-14 text-right">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------
   Monthly trend — line chart only (matches image, no fills)
--------------------------------------------------------- */
function MonthlyTrend({ data }: { data: DashboardPageData["monthlyTrend"] }) {
  return (
    <SectionCard title="Monthly Trend">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" vertical={false} />
          <XAxis dataKey="month" stroke="#94A3B8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="orders" name="Orders" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="complaintsReceived"
            name="Complaints Received"
            stroke="#A855F7"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

/* ---------------------------------------------------------
   Top Complaint Categories — horizontal progress bars
--------------------------------------------------------- */
function TopCategories({ data }: { data: DashboardPageData["categories"] }) {
  const total = data.reduce((sum, c) => sum + c.value, 0);
  const barColors = ["#3B82F6", "#A855F7", "#F97316", "#22C55E", "#94A3B8"];

  return (
    <SectionCard title="Top Complaint Categories">
      <div className="space-y-4">
        {data.map((cat, i) => {
          const pct = total ? (cat.value / total) * 100 : 0;
          return (
            <div key={cat.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-slate-300">{cat.name}</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {cat.value}{" "}
                  <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------
   Recent Orders / Complaints tables
--------------------------------------------------------- */
function SummaryTables({ data }: { data: DashboardPageData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Recent Orders" >
        <div className="overflow-x-auto">
          <Table className="bg-transparent">
            <TableElement>
              <THead>
                <tr>
                  <TH>Order ID</TH>
                  <TH>Customer</TH>
                  <TH>Service Type</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </tr>
              </THead>
              <tbody>
                {data.recentOrders.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-10 text-center text-gray-400">
                      No recent orders found.
                    </TD>
                  </TR>
                ) : (
                  data.recentOrders.map((order) => (
                    <TR key={order._id ?? order.orderId}>
                      <TD className="font-medium text-gray-900 dark:text-white">{order.orderId}</TD>
                      <TD>{order.customerName}</TD>
                      <TD>{order.serviceType}</TD>
                      <TD>
                        <Badge variant={order.paid ? "success" : "warning"}>{order.status}</Badge>
                      </TD>
                      <TD>{new Date(order.createdAt ?? Date.now()).toLocaleDateString()}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </TableElement>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Recent Complaints" >
        <div className="overflow-x-auto">
          <Table className="bg-transparent">
            <TableElement>
              <THead>
                <tr>
                  <TH>Complaint ID</TH>
                  <TH>Customer</TH>
                  <TH>Reason</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </tr>
              </THead>
              <tbody>
                {data.recentComplaints.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-10 text-center text-gray-400">
                      No recent complaints found.
                    </TD>
                  </TR>
                ) : (
                  data.recentComplaints.map((complaint) => (
                    <TR key={complaint._id ?? complaint.complaintId}>
                      <TD className="font-medium text-gray-900 dark:text-white">
                        {complaint.complaintId}
                      </TD>
                      <TD>{complaint.clientName ?? "Customer"}</TD>
                      <TD>{complaint.reason ?? complaint.assignedTeam ?? "—"}</TD>
                      <TD>
                        <Badge
                          variant={
                            complaint.status === "Completed" || complaint.status === "Resolved"
                              ? "success"
                              : complaint.status === "In Progress"
                              ? "info"
                              : "warning"
                          }
                        >
                          {complaint.status}
                        </Badge>
                      </TD>
                      <TD>{new Date(complaint.updatedAt).toLocaleDateString()}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </TableElement>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */
export function DashboardPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "shared"],
    queryFn: fetchDashboardPage,
    staleTime: 60_000,
  });

  const summaryCards = useMemo(
    () => [
      {
        label: "Total No. of Orders",
        value: data?.summary.totalOrders ?? 0,
        delta: "12.5%",
        positive: true,
        icon: ShoppingCart,
        color: KPI_COLORS.orders,
      },
      {
        label: "Complaints Received",
        value: data?.summary.complaintsReceived ?? 0,
        delta: "8.3%",
        positive: true,
        icon: ClipboardList,
        color: KPI_COLORS.received,
      },
      {
        label: "Complaints Resolved",
        value: data?.summary.complaintsResolved ?? 0,
        delta: "15.4%",
        positive: true,
        icon: CheckCircle2,
        color: KPI_COLORS.resolved,
      },
      {
        label: "Complaints Unresolved",
        value: data?.summary.complaintsUnresolved ?? 0,
        delta: "6.5%",
        positive: false,
        icon: AlertTriangle,
        color: KPI_COLORS.unresolved,
      },
      {
        label: "Paid Services Done",
        value: data?.summary.paidServicesDone ?? 0,
        delta: "14.2%",
        positive: true,
        icon: Wallet,
        color: KPI_COLORS.paid,
      },
    ],
    [data]
  );

  if (!ready) return null;

  return (
    <DashboardShell
      role={role}
      title={role === "admin" ? "Admin Dashboard" : "Team Dashboard"}
      subtitle="Overview of service operations and performance."
    >
      <div className="min-h-screen rounded-2xl bg-gray-50 dark:bg-slate-950 p-4 lg:p-6">
        {isLoading || !data ? (
          <LoadingState />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            className="space-y-6"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
              {summaryCards.map((card) => (
                <KpiCard key={card.label} {...card} />
              ))}
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
              <UnresolvedByReason data={data.unresolvedReasons} />
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="grid gap-6 xl:grid-cols-3"
            >
              <ComplaintsOverview data={data} />
              <div className="xl:col-span-2">
                <MonthlyTrend data={data.monthlyTrend} />
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
              <TopCategories data={data.categories} />
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
              <SummaryTables data={data} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}