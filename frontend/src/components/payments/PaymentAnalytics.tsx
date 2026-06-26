"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPaymentStats, fetchPayments } from "@/services/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function PaymentAnalytics() {
  const { data: stats } = useQuery({ queryKey: ["payment-stats"], queryFn: fetchPaymentStats });
  const { data: payments } = useQuery({ queryKey: ["payments", { limit: 1000, status: "Completed" }], queryFn: () => fetchPayments({ limit: 1000, status: "Completed" }) });

  const modeData = [
    { name: "UPI", value: payments?.items.filter(p => p.paymentMode === "UPI").length || 0 },
    { name: "Cash", value: payments?.items.filter(p => p.paymentMode === "Cash").length || 0 },
    { name: "Card", value: payments?.items.filter(p => p.paymentMode === "Card").length || 0 },
    { name: "Net Banking", value: payments?.items.filter(p => p.paymentMode === "Net Banking").length || 0 },
  ].filter(d => d.value > 0);

  const trendData = (stats as any)?.trend || [];

  return (
    <DashboardShell
      role="admin"
      title="Financial Analytics"
      subtitle="Deep dive into revenue trends, collection modes, and team performance."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#82ca9d" fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Payment Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Monthly Collection Target</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
