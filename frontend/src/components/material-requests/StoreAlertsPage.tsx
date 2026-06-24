"use client";

import { Loader2, Bell, Package } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useAlerts } from "@/hooks/useAlerts";
import { useMaterialRequests } from "@/hooks/useMaterialRequests";
import { Badge } from "@/components/ui/badge";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";

export function StoreAlertsPage() {
  const { ready } = useSession("store");
  const { data: alertsData, isLoading: alertsLoading } = useAlerts();
  const { data: requestsData, isLoading: requestsLoading } = useMaterialRequests({ limit: 100 });

  const materialAlerts = alertsData?.materialAlerts ?? [];
  const requests = requestsData?.items ?? [];

  const findRequest = (requestId: string) =>
    requests.find((r) => r.requestId === requestId);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      role="store"
      title="Material Alerts"
      subtitle="All incoming material requirement notifications"
    >
      <div className="space-y-6">
        <div className={cn(panelClass, "p-5")}>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">New & Active Alerts</h2>
            <Badge className="bg-amber-500/20 text-amber-300">{materialAlerts.length}</Badge>
          </div>

          {alertsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : materialAlerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No material alerts right now</p>
          ) : (
            <div className="space-y-3">
              {materialAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(alert.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <Link
                      href="/store/material-requests"
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn(panelClass, "p-5")}>
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">All Material Requests</h2>
            <Badge className="bg-teal-500/20 text-teal-300">{requests.length}</Badge>
          </div>

          {requestsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No material requests submitted yet. Team members can submit from Material Requests or
              My Tasks (Need Material).
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const alert = materialAlerts.find((a) => a.requestId === req.requestId);
                return (
                  <div
                    key={req._id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row"
                  >
                    {req.imageUrl ? (
                      <img
                        src={req.imageUrl}
                        alt={req.materialName}
                        className="h-24 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[10px] text-slate-500">
                        No image
                      </div>
                    )}
                    <div className="flex-1 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-teal-300">{req.requestId}</span>
                        <Badge className="bg-amber-500/20 text-amber-300">{req.status}</Badge>
                      </div>
                      <p className="mt-1 font-semibold text-white">{req.materialName}</p>
                      <p className="text-slate-400">
                        {req.quantity} {req.unit} · {req.requestedBy} ({req.department || "N/A"})
                      </p>
                      <p className="mt-1 text-slate-500">{req.remarks || "—"}</p>
                      {alert && (
                        <p className="mt-2 text-xs text-amber-400/90">{alert.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
