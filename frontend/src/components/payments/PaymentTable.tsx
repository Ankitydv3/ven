// components/payments/PaymentTable.tsx
"use client";

import { useState } from "react";
import { usePayments, useDownloadInvoice, useExportPaymentsCSV } from "@/hooks/usePayments";
import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileDown,
  Eye,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const statusColors = {
  Completed: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  Pending: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  Failed: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  Refunded: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
};

export function PaymentTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  const limit = 10;

  const { data, isLoading } = usePayments({
    q: search || undefined,
    page,
    limit,
    status: statusFilter || undefined,
    paymentMode: paymentModeFilter || undefined,
  });

  const downloadInvoice = useDownloadInvoice();
  const exportCSV = useExportPaymentsCSV();

  const handleDownloadInvoice = (id: string) => {
    downloadInvoice.mutate(id);
  };

  const handleExportCSV = () => {
    exportCSV.mutate({
      status: statusFilter || undefined,
    });
  };

  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search payments, customers..."
            className="h-10 rounded-xl border-slate-200 pl-9 dark:border-white/10 dark:bg-slate-900/50"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-900/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={paymentModeFilter}
          onValueChange={(value) => {
            setPaymentModeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-900/50">
            <SelectValue placeholder="Payment Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Modes</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Net Banking">Net Banking</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={exportCSV.isPending}
          className="h-10 rounded-xl border-slate-200 dark:border-white/10"
        >
          {exportCSV.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/50">
        <div className="overflow-x-auto">
          <TableElement>
            <THead className="bg-slate-50/80 backdrop-blur-sm dark:bg-white/5">
              <tr>
                <TH className="text-xs font-semibold uppercase tracking-wider">Payment ID</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Order ID</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Customer</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Service</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Team</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Status</TH>
                <TH className="text-xs font-semibold uppercase tracking-wider">Date</TH>
                <TH className="text-right text-xs font-semibold uppercase tracking-wider">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TR key={i}>
                    <TD colSpan={9} className="p-4">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </TD>
                  </TR>
                ))
              ) : data?.items.length === 0 ? (
                <TR>
                  <TD colSpan={9} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-8 w-8 text-slate-300" />
                      <p className="font-medium">No payments found</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  </TD>
                </TR>
              ) : (
                data?.items.map((payment, index) => (
                  <motion.tr
                    key={payment._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-slate-100 transition hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <TD className="font-mono text-xs font-semibold text-[#185FA5] dark:text-[#85B7EB]">
                      {payment.paymentId}
                    </TD>
                    <TD className="font-mono text-xs text-slate-500">
                      {payment.orderId || "-"}
                    </TD>
                    <TD>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {payment.customerName}
                        </span>
                        <span className="text-xs text-slate-500">{payment.mobile}</span>
                      </div>
                    </TD>
                    <TD className="text-sm text-slate-600 dark:text-slate-300">
                      {payment.serviceType}
                    </TD>
                    <TD className="text-right font-bold text-slate-900 dark:text-white">
                      ₹{payment.totalAmount.toLocaleString()}
                    </TD>
                    <TD className="text-sm text-slate-500">{payment.team || "-"}</TD>
                    <TD>
                      <Badge
                        className={cn(
                          "rounded-full border-0 font-medium",
                          statusColors[payment.status as keyof typeof statusColors] ||
                            "bg-slate-500/10 text-slate-500"
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {format(new Date(payment.createdAt), "dd MMM yyyy")}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          title="View Details"
                          onClick={() => {
                            // Navigate to payment details
                            window.location.href = `/admin/payments/${payment._id}`;
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-600"
                          title="Download Invoice"
                          onClick={() => handleDownloadInvoice(payment._id)}
                          disabled={downloadInvoice.isPending}
                        >
                          {downloadInvoice.isPending &&
                          downloadInvoice.variables === payment._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TD>
                  </motion.tr>
                ))
              )}
            </tbody>
          </TableElement>
        </div>
      </div>

      {/* Pagination */}
      {data && data.items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} of {data.total} payments
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 w-9 rounded-xl border-slate-200 p-0 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-9 w-9 rounded-xl border-slate-200 p-0 dark:border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}