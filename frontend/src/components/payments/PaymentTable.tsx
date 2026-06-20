"use client";

import { useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileDown, Eye, Download, Printer, Mail } from "lucide-react";

import { format } from "date-fns";

export function PaymentTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayments({ q: search, page, limit: 10 });
const handleDownloadInvoice = async (id: string) => {
  try {
    const token = localStorage.getItem("complaint-system-token");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/payments/${id}/invoice`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download invoice");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${id}.pdf`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Failed to download invoice");
  }
};
  const handleExportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/payments/export/csv`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search payments, customers..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileDown className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/50 overflow-hidden">
        <TableElement>
          <THead className="bg-slate-50 dark:bg-white/5">
            <tr>
              <TH>Payment ID</TH>
              <TH>Customer</TH>
              <TH>Service</TH>
              <TH>Amount</TH>
              <TH>Mode</TH>
              <TH>Status</TH>
              <TH>Date</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TR key={i}>
                  <TD colSpan={8} className="p-4"><div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" /></TD>
                </TR>
              ))
            ) : data?.items.length === 0 ? (
              <TR>
                <TD colSpan={8} className="p-8 text-center text-slate-500">No payments found</TD>
              </TR>
            ) : (
              data?.items.map((payment) => (
                <TR key={payment._id}>
                  <TD className="font-mono text-xs font-semibold text-[#2F6B63] dark:text-[#7BE3CF]">{payment.paymentId}</TD>
                  <TD>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-white">{payment.customerName}</span>
                      <span className="text-xs text-slate-500">{payment.mobile}</span>
                    </div>
                  </TD>
                  <TD className="text-sm">{payment.serviceType}</TD>
                  <TD className="font-bold text-slate-900 dark:text-white">₹{payment.totalAmount.toLocaleString()}</TD>
                  <TD>
                    <Badge variant="outline" className="font-normal">{payment.paymentMode}</Badge>
                  </TD>
                  <TD>
                    <Badge
                      variant={payment.status === "Completed" ? "success" : payment.status === "Pending" ? "warning" : "destructive"}
                      className="rounded-full"
                    >
                      {payment.status}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-slate-500">{format(new Date(payment.createdAt), "dd MMM yyyy")}</TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-blue-500"
  title="Download Invoice"
  onClick={() => handleDownloadInvoice(payment._id)}
>
  <Download className="h-4 w-4" />
</Button>
                      
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </TableElement>
      </div>
    </div>
  );
}
