"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  Search,
  ArrowUpDown,
  ThumbsUp,
  PackageX,
  Hourglass,
  History,
  ImageOff,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useAlerts } from "@/hooks/useAlerts";
import {
  useMaterialRequests,
  useMaterialRequestStats,
  useUpdateMaterialRequestStatus,
} from "@/hooks/useMaterialRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { MaterialRequest } from "@/services/material-requests";
import {
  getMaterialStatusBadgeClass,
  materialStatusLabel,
  materialStoreActionLabel,
} from "@/services/material-requests";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { modalViewportClass, summaryListCardClass, wrapTextClass } from "@/lib/responsive-text";
import { getApiErrorMessage } from "@/lib/api";

/* ----------------------------------------------------------------------- */
/* Types & constants                                                       */
/* ----------------------------------------------------------------------- */

type SortOrder = "newest" | "oldest";
type Urgency = "urgent" | "pending" | "normal";

const QUEUE_STATUSES = ["AWAITING_STORE", "WAITING", "OUT_OF_STOCK", "WAITING_FOR_STOCK", "WAITING_BY_STORE"];

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "QUEUE", label: "Needs action" },
  { value: "ALL", label: "All" },
  { value: "AWAITING_STORE", label: materialStatusLabel["AWAITING_STORE"] },
  { value: "WAITING_FOR_STOCK", label: materialStatusLabel["WAITING_FOR_STOCK"] },
  { value: "WAITING_BY_STORE", label: materialStatusLabel["WAITING_BY_STORE"] },
  { value: "OUT_OF_STOCK", label: materialStatusLabel["OUT_OF_STOCK"] },
  { value: "GRANTED_BY_STORE", label: materialStatusLabel["GRANTED_BY_STORE"] },
  { value: "GRANTED", label: materialStatusLabel["GRANTED"] },
];

function getUrgency(req: MaterialRequest): Urgency {
  if (!QUEUE_STATUSES.includes(req.status)) return "normal";
  const days = (Date.now() - new Date(req.requestDate).getTime()) / 86_400_000;
  if (days >= 3) return "urgent";
  if (days >= 1) return "pending";
  return "normal";
}

/* ----------------------------------------------------------------------- */
/* Small building blocks                                                   */
/* ----------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        panelClass,
        "flex items-center justify-between p-5 text-left transition-all",
        onClick && "cursor-pointer hover:scale-[1.02] hover:border-blue-500/40 active:scale-[0.98]"
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
      </div>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
    </button>
  );
}

function UrgencyTag({ urgency }: { urgency: Urgency }) {
  if (urgency === "normal") return null;
  const isUrgent = urgency === "urgent";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isUrgent ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isUrgent ? "animate-pulse bg-red-400" : "bg-amber-400")} />
      {isUrgent ? "Overdue" : "Aging"}
    </span>
  );
}

function RequestImage({
  url,
  alt,
  size = "md",
}: {
  url?: string;
  alt: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  if (!url) {
    return (
      <div
        className={cn(
          dims,
          "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-slate-500"
        )}
      >
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img src={url} alt={alt} className={cn(dims, "shrink-0 rounded-lg border border-white/10 object-cover")} />
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function AuditTimeline({ history }: { history: MaterialRequest["history"] }) {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
  return (
    <div className="border-t border-white/10 pt-3">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <History className="h-3.5 w-3.5" /> Audit log
      </p>
      <div className="max-h-40 space-y-3 overflow-y-auto pr-1">
        {sorted.map((h, i) => (
          <div key={i} className="flex gap-3 text-xs">
            <div className="flex flex-col items-center">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
              {i < sorted.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
            </div>
            <div className="-mt-0.5 pb-1">
              <p className="text-slate-300">
                <span className="font-medium text-white">{h.action}</span> by {h.by}
              </p>
              <p className="text-slate-500">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}</p>
              {h.remarks && <p className="mt-0.5 text-slate-400">{h.remarks}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Filters bar                                                              */
/* ----------------------------------------------------------------------- */

function FiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onToggleSort,
  onRefresh,
  counts,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  sortOrder: SortOrder;
  onToggleSort: () => void;
  onRefresh: () => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusFilterChange(opt.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === opt.value
                ? "bg-blue-500 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            )}
          >
            {opt.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[opt.value] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by request ID, material, requester, department..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-white/10 text-white"
          onClick={onToggleSort}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-white/10 text-white"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Alerts panel                                                             */
/* ----------------------------------------------------------------------- */


/* ----------------------------------------------------------------------- */
/* Desktop table row & mobile card                                         */
/* ----------------------------------------------------------------------- */

function QuickActions({
  pending,
  onAction,
  layout = "row",
}: {
  pending: boolean;
  onAction: (action: string) => void;
  layout?: "row" | "full";
}) {
  if (layout === "full") {
    return (
      <>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => onAction("GRANTED")}
          className="flex-1 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
        >
          <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Grant
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => onAction("OUT_OF_STOCK")}
          className="flex-1 rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20"
        >
          <PackageX className="mr-1.5 h-3.5 w-3.5" /> No stock
        </Button>
      </>
    );
  }
  return (
    <>
      <button
        title="Grant"
        disabled={pending}
        onClick={() => onAction("GRANTED")}
        className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        title="Mark out of stock"
        disabled={pending}
        onClick={() => onAction("OUT_OF_STOCK")}
        className="rounded-lg bg-red-500/10 p-1.5 text-red-400 ring-1 ring-red-500/20 transition-colors hover:bg-red-500/20 disabled:opacity-40"
      >
        <PackageX className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

function RequestRow({
  req,
  selected,
  onToggleSelect,
  onReview,
  onQuickAction,
  onView,
  pending,
}: {
  req: MaterialRequest;
  selected: boolean;
  onToggleSelect: () => void;
  onReview: () => void;
  onQuickAction: (action: string) => void;
  onView: () => void;
  pending: boolean;
}) {
  const urgency = getUrgency(req);
  const canQuickAct = QUEUE_STATUSES.includes(req.status);
  return (
    <TR className="cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={onView}>
      <TD onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggleSelect} className="text-slate-400 hover:text-white">
          {selected ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
        </button>
      </TD>
      <TD>
        <RequestImage url={req.imageUrl} alt={req.materialName} size="sm" />
      </TD>
      <TD className="font-mono text-sm">{req.requestId}</TD>
      <TD>{req.requestedBy}</TD>
      <TD>{req.department || "—"}</TD>
      <TD>{req.materialName}</TD>
      <TD>
        {req.quantity} {req.unit}
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <span>{new Date(req.requestDate).toLocaleDateString("en-GB")}</span>
          <UrgencyTag urgency={urgency} />
        </div>
      </TD>
      <TD>
        <Badge className={getMaterialStatusBadgeClass(req.status)}>
          {materialStatusLabel[req.status]}
        </Badge>
      </TD>
      <TD>
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            onClick={onView}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canQuickAct && <QuickActions pending={pending} onAction={onQuickAction} layout="row" />}
          <Button size="sm" variant="outline" className="rounded-lg border-white/10 text-white" onClick={onReview}>
            Review
          </Button>
        </div>
      </TD>
    </TR>
  );
}

function RequestCard({
  req,
  selected,
  onToggleSelect,
  onReview,
  onQuickAction,
  onView,
  pending,
}: {
  req: MaterialRequest;
  selected: boolean;
  onToggleSelect: () => void;
  onReview: () => void;
  onQuickAction: (action: string) => void;
  onView: () => void;
  pending: boolean;
}) {
  const urgency = getUrgency(req);
  const canQuickAct = QUEUE_STATUSES.includes(req.status);
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors cursor-pointer",
        selected ? "border-blue-500/40 bg-blue-500/5" : "border-white/5 bg-white/[0.03]"
      )}
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} className="mt-1 text-slate-400 hover:text-white">
          {selected ? <CheckSquare className="h-4 w-4 text-blue-400" /> : <Square className="h-4 w-4" />}
        </button>
        <RequestImage url={req.imageUrl} alt={req.materialName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-blue-400/80">{req.requestId}</p>
              <h4 className="truncate text-sm font-bold text-white">{req.materialName}</h4>
            </div>
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
               <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                onClick={onView}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Badge className={cn("shrink-0", getMaterialStatusBadgeClass(req.status))}>
                {materialStatusLabel[req.status]}
              </Badge>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {req.requestedBy} · {req.department || "N/A"} · {req.quantity} {req.unit}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span>{new Date(req.requestDate).toLocaleDateString("en-GB")}</span>
            <UrgencyTag urgency={urgency} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.04] pt-3">
        {canQuickAct && <QuickActions pending={pending} onAction={onQuickAction} layout="full" />}
        <Button
          size="sm"
          variant="outline"
          className="flex-1 rounded-lg border-white/10 text-white"
          onClick={onReview}
        >
          Review
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* KPI details modal                                                       */
/* ----------------------------------------------------------------------- */

function KpiDetailsModal({
  isOpen,
  onClose,
  title,
  filters,
  onReview,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filters: any;
  onReview: (req: MaterialRequest) => void;
}) {
  const { data, isLoading } = useMaterialRequests({ ...filters, limit: 50 });
  const [modalSearch, setModalSearch] = useState("");

  useEffect(() => {
    if (isOpen) setModalSearch("");
  }, [isOpen, title]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const q = modalSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.requestId.toLowerCase().includes(q) ||
        item.materialName.toLowerCase().includes(q) ||
        item.requestedBy.toLowerCase().includes(q)
    );
  }, [data, modalSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(modalViewportClass, "flex max-h-[85vh] flex-col overflow-hidden border-white/10 bg-[#0b1424] p-0 text-white sm:max-w-4xl")}>
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Filter these results..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
        </DialogHeader>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 pt-2">
          {isLoading && !data ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No requests found"
              description="Nothing matches this category and search yet."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item._id}
                  className={summaryListCardClass}
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 font-mono text-[11px] text-blue-400/80">{item.requestId}</p>
                      <h4 className={cn("text-sm font-bold text-white", wrapTextClass)}>{item.materialName}</h4>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 border-0 text-[10px] font-bold uppercase",
                        getMaterialStatusBadgeClass(item.status)
                      )}
                    >
                      {materialStatusLabel[item.status] || item.status}
                    </Badge>
                  </div>
                  <p className={cn("mb-4 text-xs leading-relaxed text-slate-400", wrapTextClass)}>
                    {item.requestedBy} · {item.department || "N/A"} · {item.quantity} {item.unit}
                  </p>
                  <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {new Date(item.requestDate).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => onReview(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/20 transition-all hover:bg-blue-500/20"
                    >
                      Review details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------------- */
/* Review modal                                                            */
/* ----------------------------------------------------------------------- */

function ReviewModal({
  request,
  remarks,
  onRemarksChange,
  availability,
  onAvailabilityChange,
  decision,
  onDecisionChange,
  revisitDate,
  onRevisitDateChange,
  revisitTimeSlot,
  onRevisitTimeSlotChange,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  request: MaterialRequest | null;
  remarks: string;
  onRemarksChange: (v: string) => void;
  availability: "AVAILABLE" | "OUT_OF_STOCK" | null;
  onAvailabilityChange: (v: "AVAILABLE" | "OUT_OF_STOCK") => void;
  decision: "WAIT" | "GRANT" | null;
  onDecisionChange: (v: "WAIT" | "GRANT" | null) => void;
  revisitDate: string;
  onRevisitDateChange: (v: string) => void;
  revisitTimeSlot: string;
  onRevisitTimeSlotChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-white/10 bg-app text-white">
        <DialogHeader>
          <DialogTitle>Store Manager Review — {request?.requestId}</DialogTitle>
        </DialogHeader>
        {request && (
          <div className="space-y-5 text-sm">
            {request.imageUrl && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                <img
                  src={request.imageUrl}
                  alt={request.materialName}
                  className="max-h-48 w-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
              <div>
                <p className="text-slate-500 uppercase font-bold tracking-tighter">Material</p>
                <p className="font-semibold text-white">{request.materialName}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold tracking-tighter">Quantity</p>
                <p className="font-semibold text-white">{request.quantity} {request.unit}</p>
              </div>
              <div className="mt-1">
                <p className="text-slate-500 uppercase font-bold tracking-tighter">Requester</p>
                <p className="font-medium text-slate-300">{request.requestedBy} ({request.department || "—"})</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-tight text-slate-400">Decision & Action</p>

              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">1. Select Stock Availability</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={availability === "AVAILABLE" ? "default" : "outline"}
                    className={cn(
                      "flex-1 rounded-xl",
                      availability === "AVAILABLE" && "bg-emerald-600 hover:bg-emerald-500"
                    )}
                    onClick={() => onAvailabilityChange("AVAILABLE")}
                  >
                    <Package className="mr-1.5 h-3.5 w-3.5" /> Stock Available
                  </Button>
                  <Button
                    size="sm"
                    variant={availability === "OUT_OF_STOCK" ? "default" : "outline"}
                    className={cn(
                      "flex-1 rounded-xl",
                      availability === "OUT_OF_STOCK" && "bg-red-600 hover:bg-red-500"
                    )}
                    onClick={() => onAvailabilityChange("OUT_OF_STOCK")}
                  >
                    <PackageX className="mr-1.5 h-3.5 w-3.5" /> Out of Stock
                  </Button>
                </div>

                {availability === "AVAILABLE" && (
                  <>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                      <p className="font-semibold text-emerald-300">Stock is available</p>
                      <p className="mt-1 text-slate-300">
                        {request.quantity} {request.unit} of {request.materialName} is in stock.
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">2. Choose action</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={decision === "GRANT" ? "default" : "outline"}
                        className={cn("flex-1 rounded-xl", decision === "GRANT" && "bg-blue-600")}
                        onClick={() => onDecisionChange("GRANT")}
                      >
                        Grant & Forward
                      </Button>
                      <Button
                        size="sm"
                        variant={decision === "WAIT" ? "default" : "outline"}
                        className={cn("flex-1 rounded-xl", decision === "WAIT" && "bg-orange-600")}
                        onClick={() => onDecisionChange("WAIT")}
                      >
                        Reschedule
                      </Button>
                    </div>
                    {decision === "GRANT" && (
                      <p className="text-xs text-slate-400">
                        Material will be granted and forwarded to the requester.
                      </p>
                    )}
                  </>
                )}

                {availability === "OUT_OF_STOCK" && (
                  <>
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs">
                      <p className="font-semibold text-red-300">Out of stock</p>
                      <p className="mt-1 text-slate-300">
                        We are out of stock. We will notify the requester when {request.materialName} becomes
                        available.
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">2. Wait for stock replenishment</p>
                  </>
                )}
              </div>
            </div>

            {decision === "WAIT" && availability === "AVAILABLE" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="col-span-2 text-xs text-emerald-200">
                  Stock is available — select when the requester should collect.
                </p>
                <div>
                  <p className="mb-1 text-[10px] uppercase font-bold text-emerald-400">Reschedule date *</p>
                  <input
                    type="date"
                    value={revisitDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => onRevisitDateChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase font-bold text-emerald-400">Time slot</p>
                  <select
                    value={revisitTimeSlot}
                    onChange={(e) => onRevisitTimeSlotChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-app px-2 text-sm text-white"
                  >
                    <option value="">Select slot</option>
                    {["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", "Full Day"].map((s) => (
                      <option key={s} value={s} className="bg-app">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {decision === "WAIT" && availability === "OUT_OF_STOCK" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="col-span-2 text-xs text-orange-200">
                  Out of stock — we will notify once stock arrives. Set expected wait period.
                </p>
                <div>
                  <p className="mb-1 text-[10px] uppercase font-bold text-orange-400">Wait till date *</p>
                  <input
                    type="date"
                    value={revisitDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => onRevisitDateChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase font-bold text-orange-400">Time slot</p>
                  <select
                    value={revisitTimeSlot}
                    onChange={(e) => onRevisitTimeSlotChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-app px-2 text-sm text-white"
                  >
                    <option value="">Select slot</option>
                    {["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", "Full Day"].map((s) => (
                      <option key={s} value={s} className="bg-app">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-tight text-slate-400">Remarks</p>
              <Textarea
                value={remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className="min-h-[70px] rounded-xl border-white/10 bg-white/5"
                placeholder="Instructions / comments..."
              />
            </div>

            <Button
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-6 font-bold uppercase tracking-wide"
              disabled={!decision || isSubmitting || (decision === "WAIT" && !revisitDate)}
              onClick={onSubmit}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
              {decision === "GRANT"
                ? "Grant & Forward"
                : availability === "OUT_OF_STOCK"
                  ? "Confirm — Wait for Stock"
                  : "Confirm Reschedule"}
            </Button>
            <AuditTimeline history={request.history} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------------- */
/* Main page                                                               */
/* ----------------------------------------------------------------------- */

export function StoreManagerPage({ view = "dashboard" }: { view?: "dashboard" | "requests" }) {
  const { ready } = useSession("store");
  const searchParams = useSearchParams();
  const { data: stats, isLoading: statsLoading } = useMaterialRequestStats();
  const { data, isLoading, isError, error, refetch } = useMaterialRequests({ limit: 100 });
  const { data: alertsData } = useAlerts();
  const updateMutation = useUpdateMaterialRequestStatus();

  const [selected, setSelected] = useState<MaterialRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [availability, setAvailability] = useState<"AVAILABLE" | "OUT_OF_STOCK" | null>(null);
  const [decision, setDecision] = useState<"WAIT" | "GRANT" | null>(null);
  const [revisitDate, setRevisitDate] = useState("");
  const [revisitTimeSlot, setRevisitTimeSlot] = useState("");
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("QUEUE");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    filters: any;
  }>({
    isOpen: false,
    title: "",
    filters: {},
  });

  const requests = data?.items ?? [];
  const materialAlerts = alertsData?.materialAlerts ?? [];

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: requests.length,
      QUEUE: 0,
      AWAITING_STORE: 0,
      WAITING: 0,
      OUT_OF_STOCK: 0,
      GRANTED: 0,
    };
    for (const r of requests) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (QUEUE_STATUSES.includes(r.status)) counts.QUEUE += 1;
    }
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter === "QUEUE") {
      list = list.filter((r) => QUEUE_STATUSES.includes(r.status));
    } else if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.requestId.toLowerCase().includes(q) ||
          r.materialName.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q) ||
          (r.department ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.requestDate).getTime();
      const db = new Date(b.requestDate).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
  }, [requests, statusFilter, search, sortOrder]);

  function openReview(req: MaterialRequest) {
    setSelected(req);
    setRemarks(req.storeManagerRemarks ?? "");
    setAvailability(null);
    setDecision(null);
    setRevisitDate(req.scheduledRevisitDate ?? "");
    setRevisitTimeSlot(req.scheduledRevisitTimeSlot ?? "");
  }

  useEffect(() => {
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (!id || requests.length === 0 || action !== "review") return;
    const target = requests.find((r) => r._id === id || r.requestId === id);
    if (target) openReview(target);
  }, [searchParams, requests]);

  const allVisibleSelected =
    filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.has(r._id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredRequests.map((r) => r._id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  }

  async function quickAction(req: MaterialRequest, action: string) {
    setPendingRowId(req._id);
    try {
      if (action === "GRANTED") {
        await updateMutation.mutateAsync({
          id: req._id,
          decision: "GRANT",
          availability: "AVAILABLE",
        });
      } else {
        // Mapping for quick action: No stock -> WAIT for stock
        await updateMutation.mutateAsync({
          id: req._id,
          decision: "WAIT",
          availability: "OUT_OF_STOCK",
          revisitDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        });
      }
      toast.success(`${req.requestId} updated successfully`);
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update request"));
    } finally {
      setPendingRowId(null);
    }
  }

  async function handleBulkAction(action: string) {
    if (selectedIds.size === 0) return;
    setBulkPending(true);
    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try {
        if (action === "GRANTED") {
          await updateMutation.mutateAsync({
            id,
            decision: "GRANT",
            availability: "AVAILABLE",
          });
        } else {
          await updateMutation.mutateAsync({
            id,
            decision: "WAIT",
            availability: "OUT_OF_STOCK",
            revisitDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          });
        }
        success++;
      } catch {
        // continue
      }
    }
    if (success === ids.length) {
      toast.success(`${success} requests updated successfully`);
    } else {
      toast.error(`Updated ${success} of ${ids.length} requests. Some failed.`);
    }
    setSelectedIds(new Set());
    setBulkPending(false);
    void refetch();
  }

  async function handleAction() {
    if (!selected || !decision || !availability) return;
    if (decision === "WAIT" && !revisitDate) {
      toast.error(
        availability === "OUT_OF_STOCK"
          ? "Wait till date is required when material is out of stock"
          : "Reschedule date is required"
      );
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: selected._id,
        decision,
        availability,
        storeManagerRemarks: remarks.trim() || undefined,
        revisitDate: decision === "WAIT" ? revisitDate : undefined,
        revisitTimeSlot: decision === "WAIT" ? revisitTimeSlot || undefined : undefined,
      });
      toast.success(`Decision submitted successfully`);
      setSelected(null);
      setRemarks("");
      setAvailability(null);
      setDecision(null);
      setRevisitDate("");
      setRevisitTimeSlot("");
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update request"));
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const title = view === "requests" ? "Material requests" : "Store manager dashboard";
  const subtitle =
    view === "requests"
      ? "Review, filter, and act on every material requirement request"
      : "Review and approve material requirement requests";

  return (
    <DashboardShell role="store" title={title} subtitle={subtitle}>
      <KpiDetailsModal
        {...detailModal}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        onReview={(req) => {
          openReview(req);
          setDetailModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />

      <div className="space-y-6 pb-24">
        {view === "dashboard" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {statsLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : (
              <>
                <StatCard
                  label="Total requests"
                  value={stats?.total ?? 0}
                  icon={Package}
                  iconClass="bg-blue-500/15 text-blue-400"
                  onClick={() => setDetailModal({ isOpen: true, title: "All material requests", filters: {} })}
                />
                <StatCard
                  label="Awaiting store"
                  value={stats?.awaitingStore ?? 0}
                  icon={Clock}
                  iconClass="bg-cyan-500/15 text-cyan-400"
                  onClick={() =>
                    setDetailModal({ isOpen: true, title: "Awaiting store action", filters: { status: "AWAITING_STORE" } })
                  }
                />
                <StatCard
                  label="Waiting stock"
                  value={stats?.waiting ?? 0}
                  icon={Hourglass}
                  iconClass="bg-orange-500/15 text-orange-400"
                  onClick={() => setDetailModal({ isOpen: true, title: "Waiting for stock", filters: { status: "WAITING" } })}
                />
                <StatCard
                  label="Out of stock"
                  value={stats?.outOfStock ?? 0}
                  icon={XCircle}
                  iconClass="bg-red-500/15 text-red-400"
                  onClick={() =>
                    setDetailModal({ isOpen: true, title: "Out of stock requests", filters: { status: "OUT_OF_STOCK" } })
                  }
                />
                <StatCard
                  label="Granted"
                  value={stats?.granted ?? 0}
                  icon={CheckCircle2}
                  iconClass="bg-emerald-500/15 text-emerald-400"
                  onClick={() => setDetailModal({ isOpen: true, title: "Granted requests", filters: { status: "GRANTED" } })}
                />
              </>
            )}
          </div>
        )}

        

        <div className={cn(panelClass, "overflow-hidden")}>
          <div className="border-b border-white/10 px-5 py-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Material requests</h2>
              <p className="text-sm text-slate-400">
                Showing {filteredRequests.length} of {requests.length} requests
              </p>
            </div>
            <FiltersBar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOrder={sortOrder}
              onToggleSort={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
              onRefresh={() => void refetch()}
              counts={filterCounts}
            />
          </div>

          {isLoading && !data ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load requests"
              description={getApiErrorMessage(error, "Failed to load requests")}
              action={
                <Button variant="outline" className="rounded-xl border-white/10 text-white" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No requests match these filters"
              description={
                statusFilter === "QUEUE"
                  ? "Requests appear here after Service Head approval and payment confirmation."
                  : "Try a different filter or clear your search."
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <TableElement>
                  <THead>
                    <TR>
                      <TH>
                        <button onClick={toggleSelectAllVisible} className="text-slate-400 hover:text-white">
                          {allVisibleSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TH>
                      <TH>Image</TH>
                      <TH>Request ID</TH>
                      <TH>Requester</TH>
                      <TH>Department</TH>
                      <TH>Material</TH>
                      <TH>Qty</TH>
                      <TH>Date</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Action</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <RequestRow
                        key={req._id}
                        req={req}
                        selected={selectedIds.has(req._id)}
                        onToggleSelect={() => toggleSelect(req._id)}
                        onReview={() => openReview(req)}
                        onQuickAction={(status) => quickAction(req, status)}
                        onView={() => openReview(req)}
                        pending={updateMutation.isPending && pendingRowId === req._id}
                      />
                    ))}
                  </tbody>
                </TableElement>
              </div>

              {/* Mobile / tablet cards */}
              <div className="space-y-3 p-4 lg:hidden">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req._id}
                    req={req}
                    selected={selectedIds.has(req._id)}
                    onToggleSelect={() => toggleSelect(req._id)}
                    onReview={() => openReview(req)}
                    onQuickAction={(status) => quickAction(req, status)}
                    onView={() => openReview(req)}
                    pending={updateMutation.isPending && pendingRowId === req._id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6">
          <div className="flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1424]/95 p-3 shadow-2xl backdrop-blur">
            <p className="px-2 text-sm font-medium text-white">{selectedIds.size} selected</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={bulkPending}
                onClick={() => handleBulkAction("GRANTED")}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500"
              >
                {bulkPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                )}
                Grant all
              </Button>
              <Button
                size="sm"
                disabled={bulkPending}
                onClick={() => handleBulkAction("OUT_OF_STOCK")}
                className="rounded-lg bg-red-600 hover:bg-red-500"
              >
                <PackageX className="mr-1.5 h-3.5 w-3.5" /> Out of stock
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => setSelectedIds(new Set())}
                className="rounded-lg border-white/10 text-white"
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal
        request={selected}
        remarks={remarks}
        onRemarksChange={setRemarks}
        availability={availability}
        onAvailabilityChange={(v) => {
          setAvailability(v);
          setDecision(v === "OUT_OF_STOCK" ? "WAIT" : null);
        }}
        decision={decision}
        onDecisionChange={setDecision}
        revisitDate={revisitDate}
        onRevisitDateChange={setRevisitDate}
        revisitTimeSlot={revisitTimeSlot}
        onRevisitTimeSlotChange={setRevisitTimeSlot}
        onSubmit={handleAction}
        onClose={() => {
          setSelected(null);
          setAvailability(null);
          setDecision(null);
          setRevisitDate("");
          setRevisitTimeSlot("");
        }}
        isSubmitting={updateMutation.isPending}
      />
    </DashboardShell>
  );
}