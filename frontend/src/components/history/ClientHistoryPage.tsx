"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Phone, Search, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchClientHistory } from "@/services/complaints";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import { ClientHistoryComplaintCard } from "@/components/history/ClientHistoryComplaintCard";
import { useRouter } from "next/navigation";
import { getComplaintDetailsPath } from "@/lib/record-navigation";

const PAGE_SIZE = 12;

export function ClientHistoryPage({ role }: { role: "admin" | "team" }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["client-history", query, page],
    queryFn: () => fetchClientHistory(query, page, PAGE_SIZE),
    enabled: Boolean(query),
    retry: false,
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const handleSearch = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setPage(1);
  };

  const handleViewComplaint = (complaintId: string) => {
    router.push(getComplaintDetailsPath(role, complaintId));
  };

  return (
    <DashboardShell
      role={role}
      title="Client History"
      subtitle="Search by phone number, complaint ID, or order ID"
    >
      <div className="space-y-6">
        <div className={cn(panelClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Phone, complaint ID, or order ID…"
                className="rounded-xl border-border bg-background pl-9 dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <Button
              className="rounded-xl bg-blue-600 hover:bg-blue-500"
              disabled={!search.trim() || isFetching}
              onClick={handleSearch}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        {!query ? (
          <div
            className={cn(
              panelClass,
              "flex flex-col items-center justify-center px-6 py-20 text-center"
            )}
          >
            <History className="mb-4 h-10 w-10 text-blue-500/60 dark:text-blue-400/60" />
            <p className="font-medium text-foreground">Search for a client</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Enter a mobile number, complaint ID, or order ID to view complaint history cards.
            </p>
          </div>
        ) : isLoading && !data ? (
          <div className={cn(panelClass, "flex justify-center py-20")}>
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          </div>
        ) : isError || !data ? (
          <div className={cn(panelClass, "px-6 py-16 text-center")}>
            <p className="text-red-500 dark:text-red-400">
              {getApiErrorMessage(error, "No history found for this search")}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className={cn(panelClass, "p-4 sm:p-5")}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{data.client.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {data.client.phone}
                    </p>
                    {data.client.orderId && (
                      <p className="mt-0.5 font-mono text-xs text-blue-600 dark:text-blue-300">
                        Order: {data.client.orderId}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  {[
                    { label: "Complaints", value: data.summary.totalComplaints },
                    { label: "Tasks", value: data.summary.totalTasks },
                    { label: "Materials", value: data.summary.totalMaterialRequests },
                    { label: "Payments", value: data.summary.totalPayments },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <p className="text-lg font-bold text-foreground">{value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {data.complaints.length === 0 ? (
              <div className={cn(panelClass, "px-6 py-16 text-center")}>
                <p className="text-muted-foreground">No complaints on this page.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.complaints.map((complaint) => (
                  <div
                    key={complaint.complaintId}
                    className="cursor-pointer"
                    onClick={() => handleViewComplaint(complaint.complaintId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleViewComplaint(complaint.complaintId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <ClientHistoryComplaintCard
                      complaint={complaint}
                      onView={handleViewComplaint}
                    />
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {data.total} complaint{data.total === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
