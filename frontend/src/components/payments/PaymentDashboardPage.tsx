"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaymentStatsCards } from "./PaymentStatsCards";
import { PaymentTable } from "./PaymentTable";
import { AddPaymentModal } from "./AddPaymentModal";
import { Button } from "@/components/ui/button";
import { Plus, BarChart4 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function PaymentDashboardPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <DashboardShell
      role="admin"
      title="Payment Management"
      subtitle="Monitor collections, manage material costs, and generate professional invoices."
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#04342C] dark:text-white">
            Executive Overview
          </h2>
          <div className="flex items-center gap-3">
            <Link href="/admin/payments/analytics">
              <Button variant="outline" className="hidden border-slate-200 dark:border-white/10 sm:flex">
                <BarChart4 className="mr-2 h-4 w-4" /> Analytics
              </Button>
            </Link>
            <Button
              className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </div>
        </div>

        <PaymentStatsCards />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Transaction History</h3>
          </div>
          <PaymentTable />
        </motion.div>

        <AddPaymentModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      </div>
    </DashboardShell>
  );
}
