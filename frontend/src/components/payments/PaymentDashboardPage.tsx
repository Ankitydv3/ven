// components/payments/PaymentDashboardPage.tsx
"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaymentStatsCards } from "./PaymentStatsCards";
import { PaymentTable } from "./PaymentTable";
import { AddPaymentModal } from "./AddPaymentModal";
import { Button } from "@/components/ui/button";
import { Plus, BarChart4, TrendingUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function PaymentDashboardPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    toast.success("Data refreshed");
  };

  return (
    <DashboardShell
      role="admin"
      title="Payment Management"
      subtitle="Monitor collections, manage material costs, and generate professional invoices."
    >
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#04342C] dark:text-white">
              Executive Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Real-time financial insights and payment tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-10 rounded-xl border-slate-200 dark:border-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <Button
              className="h-10 rounded-xl bg-gradient-to-r from-[#185FA5] to-[#378ADD] text-white shadow-lg shadow-[#185FA5]/20 transition-all hover:shadow-[#185FA5]/40"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </motion.div>

        <PaymentStatsCards />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Transaction History
            </h3>
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <PaymentTable />
        </motion.div>

        <AddPaymentModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />
      </div>
    </DashboardShell>
  );
}