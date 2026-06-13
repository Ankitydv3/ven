"use client";

import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardResponse } from "@/lib/types";

const pieColors = ["#f59e0b", "#0ea5e9", "#6366f1", "#10b981"];

export function DashboardCharts({ data }: { data: DashboardResponse }) {
  // Ensure all 4 statuses are present and map them to the correct order
  const statusOrder = ["Pending Assignment", "Assigned", "In Progress", "Completed"];
  const statusData = statusOrder.map(statusName => {
    const found = data.statusDistribution.find(item => item.name === statusName);
    return found || { name: statusName, value: 0 };
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Complaints Resolved By Team</CardTitle>
            <CardDescription>Resolved count across the four support teams.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.teamStats}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="team" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="completed" radius={[14, 14, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Complaint Status Distribution</CardTitle>
            <CardDescription>Share of complaints by current status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={statusData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={110} 
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Monthly Complaint Trends</CardTitle>
            <CardDescription>Complaints received from January to June.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyComplaints}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="complaints" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}