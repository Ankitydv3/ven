"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Search, User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchUserActivityHistory,
  getMaterialStatusBadgeClass,
  materialStatusLabel,
  type MaterialRequest,
} from "@/services/material-requests";
import { cn } from "@/lib/utils";

export function MaterialRequestHistoryModal({
  request,
  open,
  onClose,
}: {
  request: MaterialRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const userId = request?.requestedById ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-activity-history", userId, debouncedSearch],
    queryFn: () => fetchUserActivityHistory(userId, debouncedSearch || undefined),
    enabled: open && Boolean(userId),
  });

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!flex h-[min(90dvh,720px)] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-white/10 bg-app p-0 text-white sm:w-full">
        <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 shrink-0 text-blue-400" />
            User History
          </DialogTitle>
          <p className="text-sm text-slate-400">
            {request.requestedBy} · Request {request.requestId}
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : isError || !data ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <UserSummaryFallback request={request} />
              <RequestOnlyTimeline request={request} search={search} onSearchChange={setSearch} />
            </div>
          ) : (
            <>
              <div className="mb-4 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{data.user.name}</p>
                    <p className="text-xs text-slate-400">
                      {data.user.teamName || "—"} · {data.user.role}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  {[
                    { label: "Complaints", value: data.summary.totalComplaints },
                    { label: "Material Req.", value: data.summary.totalMaterialRequests },
                    { label: "Tasks", value: data.summary.totalTasks },
                    { label: "Events", value: data.summary.totalTimelineEntries },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-white/[0.04] px-2 py-2">
                      <p className="text-lg font-bold text-white">{value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mb-3 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search complaints, tasks, payments, actions…"
                  className="rounded-xl border-white/10 bg-white/5 pl-9 text-sm text-white"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                <div className="space-y-3 pb-2">
                  {data.timeline.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No history matches your search.</p>
                  ) : (
                    data.timeline.map((entry, i) => (
                      <div
                        key={`${entry.type}-${entry.id}-${entry.action}-${i}`}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <Badge variant="outline" className="mb-1 text-[10px] capitalize">
                              {entry.type}
                            </Badge>
                            <p className="text-sm font-medium text-white">{entry.action}</p>
                            <p className="text-xs text-slate-400">{entry.title} · {entry.id}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {materialStatusLabel[entry.status] || entry.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          by <span className="text-slate-200">{entry.by}</span>
                          {entry.paid !== undefined && (
                            <span className="ml-2">· {entry.paid ? "Paid" : "Unpaid / Warranty"}</span>
                          )}
                        </p>
                        {entry.remarks && (
                          <p className="mt-1.5 text-xs text-slate-500">{entry.remarks}</p>
                        )}
                        {entry.imageUrl && (
                          <img
                            src={entry.imageUrl}
                            alt="Attachment"
                            className="mt-2 max-h-28 rounded-lg border border-white/10 object-cover"
                          />
                        )}
                        <p className="mt-1 text-[10px] text-slate-600">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-3 text-right sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserSummaryFallback({ request }: { request: MaterialRequest }) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="font-semibold text-white">{request.requestedBy}</p>
      <p className="text-xs text-slate-400">Team member activity for this request</p>
    </div>
  );
}

function RequestOnlyTimeline({
  request,
  search,
  onSearchChange,
}: {
  request: MaterialRequest;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const entries = [...(request.history ?? [])]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .filter((e) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.by.toLowerCase().includes(q) ||
        (e.remarks ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <>
      <div className="relative mb-3 shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search this request history…"
          className="rounded-xl border-white/10 bg-white/5 pl-9 text-sm text-white"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pb-2 pr-1">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-medium text-white">{entry.action}</p>
            <p className="text-xs text-slate-400">by {entry.by}</p>
            <Badge className={cn("mt-1", getMaterialStatusBadgeClass(entry.status))}>
              {materialStatusLabel[entry.status] || entry.status}
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}
