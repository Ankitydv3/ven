"use client";

import { usePaymentStats } from "@/hooks/usePayments";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, IndianRupee, CheckCircle, Clock, RotateCcw, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export function PaymentStatsCards() {
  const { data: stats, isLoading } = usePaymentStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Payments",
      value: `₹${stats?.totalPaymentsReceived?.toLocaleString() || 0}`,
      delta: `${stats?.monthlyGrowth || 0}%`,
      trend: stats?.monthlyGrowth >= 0 ? "up" : "down",
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Paid Services",
      value: stats?.paidServicesDone || 0,
      delta: "",
      trend: "neutral",
      icon: CheckCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Average Value",
      value: `₹${Math.round(stats?.averagePaymentValue || 0).toLocaleString()}`,
      delta: "",
      trend: "neutral",
      icon: BarChart3,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Pending",
      value: stats?.pendingPayments || 0,
      delta: "",
      trend: "neutral",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Refunds",
      value: stats?.refunds || 0,
      delta: "",
      trend: "neutral",
      icon: RotateCcw,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="overflow-hidden border-slate-200 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/50">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-2 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                  
                </div>
                <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
                
              </div>
              
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
