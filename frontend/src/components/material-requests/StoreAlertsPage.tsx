"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { MaterialRequestImageThumb } from "@/components/material-requests/MaterialRequestImageThumb";
import {
  Bell,
  Package,
  Loader2,
  Search,
  SlidersHorizontal,
  CalendarDays,
  Tag,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Hourglass,
  AlertTriangle,
  ChevronRight,
  MoreHorizontal,
  Globe,
  Trash2,
  CheckCheck,
  Eye,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useAlerts, useClearAlerts } from "@/hooks/useAlerts";
import { useMaterialRequests, useUpdateMaterialRequestStatus } from "@/hooks/useMaterialRequests";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MaterialRequest } from "@/services/material-requests";
import {
  getMaterialStatusBadgeClass,
  materialStatusLabel,
} from "@/services/material-requests";
import { getNotificationHref } from "@/lib/record-navigation";
import { readUser } from "@/lib/storage";
import {
  buildNotifications,
  dismissNotificationIds,
  getDismissedNotificationIds,
} from "@/lib/notifications";

/* ─── helpers ─────────────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97 },
};

function DetailField({ icon: Icon, label, value, mono }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">{label}</p>
        <p className={cn("text-sm text-slate-200 break-words", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Section Shell ───────────────────────────────────── */

function SectionShell({
  title,
  subtitle,
  count,
  countClass,
  accent,
  search,
  onSearch,
  children,
}: {
  title: string;
  subtitle: string;
  count?: number;
  countClass?: string;
  accent: "blue" | "amber";
  search: string;
  onSearch: (v: string) => void;
  children: React.ReactNode;
}) {
  const borderTop = accent === "amber"
    ? "from-transparent via-amber-500/50 to-transparent"
    : "from-transparent via-blue-500/50 to-transparent";
  const searchFocus = accent === "amber"
    ? "focus:border-amber-500/40"
    : "focus:border-blue-500/40";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#050c18]/60 backdrop-blur-xl">
      <div className={cn("h-px w-full bg-gradient-to-r", borderTop)} />
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">{title}</h2>
              {!!count && count > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", countClass)}>
                  {count}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
          </div>
        </div>
        <div className="mt-3 relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className={cn("h-8 w-full rounded-lg border-white/8 bg-white/[0.03] pl-8 text-xs text-white placeholder:text-slate-600 hover:border-white/15", searchFocus)}
          />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {children}
      </div>
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────── */

function EmptyState({ message, accent = "blue" }: { message: string; accent?: "blue" | "amber" }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 text-center",
      accent === "amber" ? "border-amber-500/15" : "border-blue-500/15"
    )}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
        <Bell className={cn("h-5 w-5", accent === "amber" ? "text-amber-600" : "text-blue-600")} />
      </div>
      <p className="max-w-[22ch] text-xs leading-relaxed text-slate-600">{message}</p>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────── */

export function StoreAlertsPage() {
  const router = useRouter();
  const { ready } = useSession("store");
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useAlerts();
  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useMaterialRequests({ limit: 100 });
  const updateMutation = useUpdateMaterialRequestStatus();
  const clearMutation = useClearAlerts();

  const [alertSearch, setAlertSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [dismissedVersion, setDismissedVersion] = useState(0);

  const user = readUser();
  const dismissed = useMemo(() => {
    void dismissedVersion;
    return getDismissedNotificationIds(user?.id);
  }, [user?.id, dismissedVersion]);

  const materialAlerts = useMemo(
    () => (alertsData?.materialAlerts ?? []).filter((alert) => !dismissed.has(`material-${alert._id}`)),
    [alertsData, dismissed]
  );
  const requests = requestsData?.items ?? [];

  const notifications = useMemo(() => {
    if (!alertsData) return [];
    return buildNotifications("store", alertsData, dismissed);
  }, [alertsData, dismissed]);

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      await clearMutation.mutateAsync();
      if (user?.id) {
        dismissNotificationIds(
          user.id,
          notifications.map((item) => item.id)
        );
      }
      setDismissedVersion((v) => v + 1);
      toast.success("All notifications cleared");
      void refetchAlerts();
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const filteredAlerts = useMemo(() => {
    const q = alertSearch.toLowerCase();
    if (!q) return materialAlerts;
    return materialAlerts.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      a.requestId.toLowerCase().includes(q)
    );
  }, [materialAlerts, alertSearch]);

  const filteredRequests = useMemo(() => {
    const q = requestSearch.toLowerCase();
    if (!q) return requests;
    return requests.filter(r =>
      r.materialName.toLowerCase().includes(q) ||
      r.requestId.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q)
    );
  }, [requests, requestSearch]);

  const handleUpdateStatus = async (id: string, decision: "WAIT" | "GRANT", availability: "AVAILABLE" | "OUT_OF_STOCK") => {
    try {
      await updateMutation.mutateAsync({
        id,
        decision,
        availability,
        storeManagerRemarks: remarks.trim() || undefined,
      });
      toast.success(`Decision submitted successfully`);
      setSelectedRequest(null);
      setRemarks("");
      void refetchRequests();
      void refetchAlerts();
    } catch (err) {
      toast.error("Failed to update request");
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      role="store"
      title="Material Management"
      subtitle="Handle alerts and material requests efficiently."
    >
      {notifications.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clearMutation.isPending}
            onClick={() => void handleClearAll()}
            className="gap-1.5 rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {clearMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Clear messages
          </Button>
        </div>
      )}

      <div className="flex h-[calc(100vh-160px)] flex-col gap-4 lg:flex-row">
        {/* ── LEFT: New & Active Alerts ── */}
        <SectionShell
          title="Active Alerts"
          subtitle="New material requirement notifications"
          count={materialAlerts.length}
          countClass="bg-amber-500/10 text-amber-400"
          accent="amber"
          search={alertSearch}
          onSearch={setAlertSearch}
        >
          {alertsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />)}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <EmptyState message="No active alerts right now." accent="amber" />
          ) : (
            filteredAlerts.map((alert, i) => (
              <motion.div
                key={alert._id}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.05 }}
                className="group relative cursor-pointer rounded-2xl border border-amber-500/10 bg-[#080f1e]/70 p-4 backdrop-blur-md transition-all hover:border-amber-500/30 hover:bg-[#0b1628]/80"
                onClick={() => {
                  router.push(
                    getNotificationHref("store", {
                      kind: "material",
                      complaintId: alert.complaintId,
                      requestId: alert.requestId,
                    })
                  );
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                    <Bell className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{alert.title}</p>
                      <code className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                        {alert.requestId}
                      </code>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{alert.message}</p>
                    <p className="mt-2 text-[10px] text-slate-600">
                      {format(new Date(alert.createdAt), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </SectionShell>

        {/* Divider */}
        <div className="hidden w-px shrink-0 bg-gradient-to-b from-transparent via-white/8 to-transparent lg:block" />

        {/* ── RIGHT: All Material Requests ── */}
        <SectionShell
          title="Material Requests"
          subtitle="Review and process requirement requests"
          count={requests.length}
          countClass="bg-blue-500/10 text-blue-400"
          accent="blue"
          search={requestSearch}
          onSearch={setRequestSearch}
        >
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />)}
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState message="No material requests found." />
          ) : (
            filteredRequests.map((req, i) => (
              <motion.div
                key={req._id}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.05 }}
                className="group relative cursor-pointer rounded-2xl border border-blue-500/10 bg-[#080f1e]/70 p-4 backdrop-blur-md transition-all hover:border-blue-500/30 hover:bg-[#0b1628]/80"
                onClick={() => setSelectedRequest(req)}
              >
                <div className="flex items-start gap-3">
                  <MaterialRequestImageThumb
                    id={req._id}
                    hasImage={req.hasImage}
                    imageUrl={req.imageUrl}
                    alt={req.materialName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{req.materialName}</p>
                      <Badge className={cn("shrink-0 font-bold uppercase", getMaterialStatusBadgeClass(req.status))}>
                        {materialStatusLabel[req.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{req.quantity} {req.unit}</span>
                      <span className="text-slate-700">|</span>
                      <span className="truncate">{req.requestedBy}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[10px] text-slate-600">
                        {format(new Date(req.requestDate), "dd MMM yyyy")}
                      </p>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                          onClick={() => setSelectedRequest(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0b1424] text-white">
                            <DropdownMenuItem onClick={() => setSelectedRequest(req)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View & Full Actions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(req._id, "GRANT", "AVAILABLE"); }}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                              Available: Grant & Forward
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(req._id, "WAIT", "OUT_OF_STOCK"); }}>
                              <Clock className="mr-2 h-4 w-4 text-amber-400" />
                              Out of Stock: Wait
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </SectionShell>
      </div>

      {/* ── Request Detail Modal ── */}
      <Dialog open={Boolean(selectedRequest)} onOpenChange={(v) => !v && setSelectedRequest(null)}>
        <DialogContent className="border-white/8 bg-[#080f1e] p-0 text-white shadow-2xl sm:max-w-lg overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

          <div className="border-b border-white/5 p-6 pb-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-bold text-white">{selectedRequest?.materialName}</DialogTitle>
                  <Badge className={cn("font-bold uppercase", selectedRequest ? getMaterialStatusBadgeClass(selectedRequest.status) : "")}>
                    {selectedRequest ? materialStatusLabel[selectedRequest.status] : ""}
                  </Badge>
                </div>
                <code className="mt-1 inline-block rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-blue-300">
                  {selectedRequest?.requestId}
                </code>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
            {(selectedRequest?.hasImage || selectedRequest?.imageUrl) && (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <MaterialRequestImageThumb
                  id={selectedRequest._id}
                  hasImage={selectedRequest.hasImage ?? Boolean(selectedRequest.imageUrl)}
                  imageUrl={selectedRequest.imageUrl}
                  alt={selectedRequest.materialName}
                  loadImmediately
                  detail
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <DetailField icon={Tag} label="Quantity" value={`${selectedRequest?.quantity} ${selectedRequest?.unit}`} />
              <DetailField icon={User} label="Requested By" value={selectedRequest?.requestedBy} />
              <DetailField icon={CalendarDays} label="Date" value={selectedRequest ? format(new Date(selectedRequest.requestDate), "dd MMM yyyy, hh:mm a") : ""} />
              <DetailField icon={FileText} label="Department" value={selectedRequest?.department || "—"} />
            </div>

            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">Requester Remarks</p>
                <p className="text-sm text-slate-300">{selectedRequest?.remarks || "No remarks provided."}</p>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 pl-1">Store Manager Action</p>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add your comments here…"
                  className="min-h-[80px] rounded-xl border-white/8 bg-white/5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/40"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)} className="rounded-xl text-slate-500 hover:text-slate-300">
              Close
            </Button>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-xl bg-blue-600 text-white hover:bg-blue-500">
                    Take Action
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0b1424] text-white">
                  <DropdownMenuItem onClick={() => selectedRequest && handleUpdateStatus(selectedRequest._id, "GRANT", "AVAILABLE")}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                    Available: Grant & Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => selectedRequest && handleUpdateStatus(selectedRequest._id, "WAIT", "AVAILABLE")}>
                    <Clock className="mr-2 h-4 w-4 text-amber-400" />
                    Available: Wait
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => selectedRequest && handleUpdateStatus(selectedRequest._id, "WAIT", "OUT_OF_STOCK")}>
                    <Hourglass className="mr-2 h-4 w-4 text-orange-400" />
                    Out of Stock: Wait
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

