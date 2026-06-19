"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ArrowUpRight, CalendarRange, CheckCircle2, ClipboardList, CreditCard, DatabaseZap, ShoppingCart, Users2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { fetchDashboardPage } from "@/services/dashboard";
import type { DashboardPageData } from "@/lib/types";

const pieColors = ["#38BDF8", "#60A5FA", "#818CF8", "#34D399"];

const tooltipStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(3, 7, 18, 0.96)",
  color: "#fff",
  fontSize: "12px",
  boxShadow: "0 18px 50px rgba(2, 6, 23, 0.35)"
};

function KpiCard({ icon: Icon, label, value, delta }: { icon: ComponentType<{ className?: string }>; label: string; value: number; delta: string }) {
  return (
    <Card className="group relative overflow-hidden border-white/10 bg-white/5 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_100px_rgba(56,189,248,0.12)]">
      <CardContent className="relative p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-cyan-300 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <p className="font-heading text-4xl font-semibold text-white">{value.toLocaleString()}</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {delta}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
      <CardHeader className="border-b border-white/10 pb-5">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.22em] text-cyan-300">Analytics</p>
          <CardTitle className="font-heading text-xl text-white">{title}</CardTitle>
          <CardDescription className="text-slate-300">{subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[156px] rounded-[28px] bg-white/6" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[360px] rounded-[28px] bg-white/6" />
        <Skeleton className="h-[360px] rounded-[28px] bg-white/6" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[420px] rounded-[28px] bg-white/6" />
        <Skeleton className="h-[420px] rounded-[28px] bg-white/6" />
      </div>
    </div>
  );
}

function SummaryTables({ data }: { data: DashboardPageData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Recent Orders" subtitle="Live orders loaded from MongoDB.">
        <div className="overflow-x-auto">
          <Table className="bg-transparent">
            <TableElement>
              <THead>
                <tr>
                  <TH>Order ID</TH>
                  <TH>Customer</TH>
                  <TH>Service</TH>
                  <TH>Status</TH>
                  <TH>Amount</TH>
                </tr>
              </THead>
              <tbody>
                {data.recentOrders.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-10 text-center text-slate-400">No recent orders found.</TD>
                  </TR>
                ) : (
                  data.recentOrders.map((order) => (
                    <TR key={order._id ?? order.orderId}>
                      <TD className="font-medium text-white">{order.orderId}</TD>
                      <TD>{order.customerName}</TD>
                      <TD>{order.serviceType}</TD>
                      <TD>
                        <Badge variant={order.paid ? "success" : "warning"}>{order.status}</Badge>
                      </TD>
                      <TD>₹{order.amount.toLocaleString()}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </TableElement>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Recent Complaints" subtitle="Most recently updated complaints and assignments.">
        <div className="overflow-x-auto">
          <Table className="bg-transparent">
            <TableElement>
              <THead>
                <tr>
                  <TH>Complaint ID</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH>Team</TH>
                  <TH>Updated</TH>
                </tr>
              </THead>
              <tbody>
                {data.recentComplaints.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="py-10 text-center text-slate-400">No recent complaints found.</TD>
                  </TR>
                ) : (
                  data.recentComplaints.map((complaint) => (
                    <TR key={complaint._id ?? complaint.complaintId}>
                      <TD className="font-medium text-white">{complaint.complaintId}</TD>
                      <TD>{complaint.clientName ?? "Customer"}</TD>
                      <TD>
                        <Badge variant={complaint.status === "Completed" ? "success" : complaint.status === "In Progress" ? "info" : "warning"}>{complaint.status}</Badge>
                      </TD>
                      <TD>{complaint.assignedTeam ?? "Unassigned"}</TD>
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

export function DashboardPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "shared"],
    queryFn: fetchDashboardPage,
    staleTime: 60_000
  });

  const summaryCards = useMemo(
    () => [
      { label: "Total Orders", value: data?.summary.totalOrders ?? 0, delta: "+12.5%", icon: ShoppingCart },
      { label: "Complaints Received", value: data?.summary.complaintsReceived ?? 0, delta: "+8.3%", icon: ClipboardList },
      { label: "Complaints Resolved", value: data?.summary.complaintsResolved ?? 0, delta: "+15.4%", icon: CheckCircle2 },
      { label: "Complaints Unresolved", value: data?.summary.complaintsUnresolved ?? 0, delta: "-6.5%", icon: DatabaseZap },
      { label: "Paid Services Done", value: data?.summary.paidServicesDone ?? 0, delta: "+14.2%", icon: CreditCard }
    ],
    [data]
  );

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell role={role} title={role === "admin" ? "Admin Dashboard" : "Team Dashboard"} subtitle="Enterprise operations, complaints, orders, and customer analytics in one shared workspace.">
      <div className="min-h-screen rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,#020617_0%,#07111f_42%,#020617_100%)] p-4 text-white shadow-[0_24px_100px_rgba(2,6,23,0.5)] lg:p-6">
        {isLoading || !data ? (
          <LoadingState />
        ) : (
          <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-6">
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.26em] text-cyan-300">Overview</p>
                  <h2 className="font-heading text-3xl font-semibold text-white">Operations dashboard</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">One shared dashboard for admins and teams, backed by the same MongoDB data and rendered with identical UI.</p>
                </div>
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">Live</Badge>
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {summaryCards.map((card) => (
                <KpiCard key={card.label} icon={card.icon} label={card.label} value={card.value} delta={card.delta} />
              ))}
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard title="Complaint Overview" subtitle="Resolved, delayed, material shortage, and payment pending distribution.">
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={data.unresolvedReasons} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={4} cornerRadius={10}>
                          {data.unresolvedReasons.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} stroke="rgba(255,255,255,0.12)" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {data.unresolvedReasons.map((reason, index) => (
                      <div key={reason.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-cyan-400/20 hover:bg-white/[0.05]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{reason.name}</p>
                            <p className="text-xs text-slate-400">Unresolved drivers</p>
                          </div>
                          <Badge className="bg-white/5 text-white">{reason.value}</Badge>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(12, reason.value * 10)}%`, backgroundColor: pieColors[index % pieColors.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Monthly Trend" subtitle="Orders received, complaints received, and resolved by month.">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyTrend}>
                    <defs>
                      <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="complaintsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="orders" stroke="#38BDF8" fill="url(#ordersFill)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="complaintsReceived" stroke="#818CF8" fill="url(#complaintsFill)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="resolved" stroke="#34D399" strokeWidth={3} dot={{ r: 3.5, fill: "#34D399" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <SectionCard title="Top Categories" subtitle="Complaint category distribution across the business.">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.categories} layout="vertical" margin={{ left: 6, right: 18 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.14)" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#94A3B8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 14, 14, 0]}>
                      {data.categories.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Team Performance" subtitle="Assigned vs completed complaints by support team.">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.teamStats} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.14)" vertical={false} />
                    <XAxis dataKey="team" stroke="#94A3B8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="assigned" fill="#38BDF8" radius={[12, 12, 0, 0]} />
                    <Bar dataKey="completed" fill="#34D399" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
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