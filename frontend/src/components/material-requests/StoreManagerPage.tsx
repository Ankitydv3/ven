"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
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
import type { MaterialRequest } from "@/services/material-requests";
import {
  materialStatusBadgeClass,
  materialStatusLabel,
} from "@/services/material-requests";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div className={cn(panelClass, "flex items-center justify-between p-5")}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
      </div>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function RequestImage({ url, alt }: { url?: string; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[9px] text-slate-500">
        No img
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="h-16 w-16 rounded-lg border border-white/10 object-cover"
    />
  );
}

export function StoreManagerPage({ view = "dashboard" }: { view?: "dashboard" | "requests" }) {
  const { ready } = useSession("store");
  const { data: stats, isLoading: statsLoading } = useMaterialRequestStats();
  const { data, isLoading, isError, error, refetch } = useMaterialRequests({ limit: 100 });
  const { data: alertsData } = useAlerts();
  const updateMutation = useUpdateMaterialRequestStatus();
  const [selected, setSelected] = useState<MaterialRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [action, setAction] = useState<"WAITING" | "OUT_OF_STOCK" | "GRANTED" | null>(null);

  const requests = data?.items ?? [];
  const materialAlerts = alertsData?.materialAlerts ?? [];

  const handleAction = async () => {
    if (!selected || !action) return;
    try {
      await updateMutation.mutateAsync({
        id: selected._id,
        status: action,
        storeManagerRemarks: remarks.trim() || undefined,
      });
      toast.success(`Request marked as ${materialStatusLabel[action]}`);
      setSelected(null);
      setRemarks("");
      setAction(null);
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update request"));
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  const title = view === "requests" ? "Material Requests" : "Store Manager Dashboard";
  const subtitle =
    view === "requests"
      ? "Review and approve all material requirement requests"
      : "Review and approve material requirement requests";

  return (
    <DashboardShell role="store" title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {view === "dashboard" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {statsLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : (
              <>
                <StatCard label="Total Requests" value={stats?.total ?? 0} icon={Package} iconClass="bg-blue-500/15 text-blue-400" />
                <StatCard label="Pending Requests" value={stats?.pending ?? 0} icon={Clock} iconClass="bg-amber-500/15 text-amber-400" />
                <StatCard label="Waiting Requests" value={stats?.waiting ?? 0} icon={AlertTriangle} iconClass="bg-orange-500/15 text-orange-400" />
                <StatCard label="Out Of Stock" value={stats?.outOfStock ?? 0} icon={XCircle} iconClass="bg-red-500/15 text-red-400" />
                <StatCard label="Granted Requests" value={stats?.granted ?? 0} icon={CheckCircle2} iconClass="bg-emerald-500/15 text-emerald-400" />
              </>
            )}
          </div>
        )}

        <div className={cn(panelClass, "p-5")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Material Alerts</h2>
              <Badge className="bg-amber-500/20 text-amber-300">{materialAlerts.length}</Badge>
            </div>
            <Link
              href="/store/alerts"
              className="text-sm text-teal-400 hover:text-teal-300 hover:underline"
            >
              View all alerts →
            </Link>
          </div>
          {materialAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">No new material alerts</p>
          ) : (
            <div className="space-y-2">
              {materialAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert._id}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-white">{alert.title}</p>
                  <p className="text-slate-400">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn(panelClass, "overflow-hidden")}>
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Material Requests</h2>
            <p className="text-sm text-slate-400">
              {requests.length} request{requests.length !== 1 ? "s" : ""} total
            </p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-red-400">{getApiErrorMessage(error, "Failed to load requests")}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-16 text-center text-slate-400">
              No material requests yet. Team users can submit from{" "}
              <strong className="text-white">Material Requests</strong> or{" "}
              <strong className="text-white">My Tasks → Need Material</strong>.
            </p>
          ) : (
            <TableElement>
              <THead>
                <TR>
                  <TH>Image</TH>
                  <TH>Request ID</TH>
                  <TH>Requester</TH>
                  <TH>Department</TH>
                  <TH>Material</TH>
                  <TH>Qty</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <tbody>
                {requests.map((req) => (
                  <TR key={req._id}>
                    <TD>
                      <RequestImage url={req.imageUrl} alt={req.materialName} />
                    </TD>
                    <TD className="font-mono text-sm">{req.requestId}</TD>
                    <TD>{req.requestedBy}</TD>
                    <TD>{req.department || "—"}</TD>
                    <TD>{req.materialName}</TD>
                    <TD>
                      {req.quantity} {req.unit}
                    </TD>
                    <TD>{new Date(req.requestDate).toLocaleDateString("en-GB")}</TD>
                    <TD>
                      <Badge className={cn("border", materialStatusBadgeClass[req.status])}>
                        {materialStatusLabel[req.status]}
                      </Badge>
                    </TD>
                    <TD>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-white/10 text-white"
                        onClick={() => {
                          setSelected(req);
                          setRemarks(req.storeManagerRemarks ?? "");
                          setAction(null);
                        }}
                      >
                        Review
                      </Button>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </TableElement>
          )}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-white/10 bg-[#0A1F1A] text-white">
          <DialogHeader>
            <DialogTitle>Review Material Request {selected?.requestId}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {selected.imageUrl && (
                <div>
                  <p className="mb-2 text-xs text-slate-400">Attached Image</p>
                  <img
                    src={selected.imageUrl}
                    alt={selected.materialName}
                    className="max-h-48 w-full rounded-xl border border-white/10 object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Requester</p>
                  <p className="font-medium">{selected.requestedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Department</p>
                  <p className="font-medium">{selected.department || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Material</p>
                  <p className="font-medium">{selected.materialName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Quantity</p>
                  <p className="font-medium">
                    {selected.quantity} {selected.unit}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400">Remarks</p>
                <p className="text-slate-300">{selected.remarks || "—"}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-slate-400">Store Manager Remarks</p>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="min-h-[70px] rounded-xl border-white/10 bg-white/5"
                  placeholder="Add comments..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["WAITING", "OUT_OF_STOCK", "GRANTED"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={action === s ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      action === s && s === "GRANTED" && "bg-emerald-600",
                      action === s && s === "WAITING" && "bg-orange-600",
                      action === s && s === "OUT_OF_STOCK" && "bg-red-600"
                    )}
                    onClick={() => setAction(s)}
                  >
                    {materialStatusLabel[s]}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500"
                disabled={!action || updateMutation.isPending}
                onClick={handleAction}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit Action"
                )}
              </Button>
              {selected.history && selected.history.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Audit Log</p>
                  <div className="max-h-32 space-y-2 overflow-y-auto text-xs text-slate-400">
                    {selected.history.map((h, i) => (
                      <div key={i}>
                        <span className="text-slate-300">{h.action}</span> by {h.by} —{" "}
                        {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                        {h.remarks ? ` — ${h.remarks}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
