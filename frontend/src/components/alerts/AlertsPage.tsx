"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Search,
  TriangleAlert,
  Users,
  XCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { teamNames } from "@/lib/constants";
import type { Complaint, Priority, TeamReport } from "@/lib/types";
import { useAlerts, useConfirmComplaint, useDeclineComplaint } from "@/hooks/useAlerts";
import { Skeleton } from "@/components/ui/skeleton";

type AlertTab = "All Alerts" | "Team Reports" | "Website Complaints";

function priorityClass(priority?: Priority | string) {
  if (priority === "High") return "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/20";
  if (priority === "Medium") return "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/20";
  return "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/20";
}

function TeamReportRow({ report }: { report: TeamReport }) {
  const progress = report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0;

  const iconConfig =
    report.status === "all_complete"
      ? { Icon: CheckCircle2, className: "bg-[#22C55E]/15 text-[#4ADE80]" }
      : report.status === "has_pending"
        ? { Icon: Clock, className: "bg-[#F59E0B]/15 text-[#FBBF24]" }
        : { Icon: Users, className: "bg-[#64748B]/15 text-[#94A3B8]" };

  const { Icon, className } = iconConfig;

  return (
    <div className="rounded-2xl border border-[rgba(59,130,246,0.12)] bg-[rgba(10,20,35,0.5)] px-4 py-4">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", className)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{report.team}</p>
            <Badge
              className={cn(
                "rounded-full border px-2 py-0 text-[10px] font-medium",
                report.status === "all_complete"
                  ? "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/20"
                  : report.status === "has_pending"
                    ? "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/20"
                    : "bg-[#64748B]/15 text-[#94A3B8] border-[#64748B]/20"
              )}
            >
              {report.status === "all_complete"
                ? "All Done"
                : report.status === "has_pending"
                  ? "Pending"
                  : "Idle"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#94A3B8]">{report.message}</p>

          {report.totalTasks > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  {report.completedTasks} completed · {report.pendingTasks} pending
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(59,130,246,0.1)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    report.status === "all_complete" ? "bg-[#22C55E]" : "bg-[#3B82F6]"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <p className="mt-2 text-xs text-[#64748B]">
            Updated {format(new Date(report.updatedAt), "dd MMM yyyy, hh:mm a")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PendingComplaintRow({
  complaint,
  onConfirm,
  onDecline,
  confirming,
  declining,
}: {
  complaint: Complaint;
  onConfirm: () => void;
  onDecline: () => void;
  confirming: boolean;
  declining: boolean;
}) {
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-[rgba(139,92,246,0.15)] bg-[rgba(10,20,35,0.5)] px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/15 text-[#A78BFA]">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">New Complaint Received</p>
            <Badge className={cn("rounded-full border px-2 py-0 text-[10px] font-medium", priorityClass(complaint.priority))}>
              {complaint.priority}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#94A3B8]">{complaint.description || complaint.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
            <span className="font-medium text-[#A78BFA]">{complaint.complaintId}</span>
            <span>{complaint.clientName}</span>
            <span>{complaint.createdAt ? format(new Date(complaint.createdAt), "dd MMM yyyy, hh:mm a") : "—"}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
        <Button
          size="sm"
          className="rounded-xl bg-[#22C55E] text-white hover:bg-[#16A34A]"
          onClick={onConfirm}
          disabled={confirming || declining}
        >
          {confirming && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-[#EF4444]/30 text-[#F87171] hover:bg-[#EF4444]/10"
          onClick={onDecline}
          disabled={confirming || declining}
        >
          {declining && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Decline
        </Button>
      </div>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-xl rounded-xl bg-white/5" />
      <Skeleton className="h-64 rounded-2xl bg-white/5" />
      <Skeleton className="h-64 rounded-2xl bg-white/5" />
    </div>
  );
}

export function AlertsPage({ role = "admin" }: { role?: "admin" | "team" }) {
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState<AlertTab>(isAdmin ? "All Alerts" : "Team Reports");
  const [teamFilter, setTeamFilter] = useState("All Teams");
  const [search, setSearch] = useState("");
  const [declineTarget, setDeclineTarget] = useState<Complaint | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: search || undefined,
      team: teamFilter !== "All Teams" ? teamFilter : undefined,
    }),
    [search, teamFilter]
  );

  const { data, isLoading, isError, refetch } = useAlerts(filters);
  const confirmMutation = useConfirmComplaint();
  const declineMutation = useDeclineComplaint();

  const showTeamReports = activeTab === "All Alerts" || activeTab === "Team Reports";
  const showWebsiteComplaints = isAdmin && (activeTab === "All Alerts" || activeTab === "Website Complaints");

  const reportsHref = isAdmin ? "/admin/reports" : "/team/reports";
  const complaintsHref = isAdmin ? "/admin/complaints" : "/team/complaints";

  const handleConfirm = async (complaint: Complaint) => {
    setActionId(complaint._id);
    try {
      await confirmMutation.mutateAsync(complaint._id);
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setActionId(declineTarget._id);
    try {
      await declineMutation.mutateAsync({ id: declineTarget._id, reason: declineReason || undefined });
      setDeclineTarget(null);
      setDeclineReason("");
    } finally {
      setActionId(null);
    }
  };

  const tabs: AlertTab[] = isAdmin
    ? ["All Alerts", "Team Reports", "Website Complaints"]
    : ["Team Reports"];

  if (isLoading) {
    return (
      <DashboardShell
        role={role}
        title="Alerts"
        subtitle={
          isAdmin
            ? "Team task reports and website complaint reviews."
            : "Your team's task status and pending work."
        }
      >
        <AlertsSkeleton />
      </DashboardShell>
    );
  }

  if (isError || !data) {
    return (
      <DashboardShell
        role={role}
        title="Alerts"
        subtitle={
          isAdmin
            ? "Team task reports and website complaint reviews."
            : "Your team's task status and pending work."
        }
      >
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <TriangleAlert className="h-10 w-10 text-[#F87171]" />
          <p className="text-[#94A3B8]">Failed to load alerts</p>
          <Button onClick={() => refetch()} className="rounded-xl bg-[#3B82F6]">
            Retry
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="Alerts"
      subtitle={
        isAdmin
          ? "Team task reports and website complaint reviews."
          : "Your team's task status and pending work."
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {isAdmin && (
          <div className="flex items-center gap-1 overflow-x-auto border-b border-[rgba(59,130,246,0.15)] pb-px">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab ? "text-[#3B82F6]" : "text-[#64748B] hover:text-[#94A3B8]"
                )}
              >
                {tab}
                <AnimatePresence>
                  {activeTab === tab && (
                    <motion.span
                      layoutId="alerts-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] text-[#94A3B8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Teams">All Teams</SelectItem>
                {teamNames.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}

            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams..."
                className="h-10 rounded-xl border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] pl-9 text-white placeholder:text-[#64748B]"
              />
            </div>
          </div>
        </div>

        {showTeamReports && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Team Task Reports</h2>
              {data.counts.teamsWithPending > 0 && (
                <Badge className="rounded-full border-0 bg-[#F59E0B]/15 px-2.5 py-0.5 text-xs font-medium text-[#FBBF24]">
                  {data.counts.teamsWithPending} with pending tasks
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {data.teamReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(59,130,246,0.15)] py-12 text-center text-sm text-[#64748B]">
                  No team reports match your filters.
                </div>
              ) : (
                data.teamReports.map((report) => <TeamReportRow key={report.team} report={report} />)
              )}
            </div>

            <Link href={reportsHref} className="inline-block text-sm font-medium text-[#3B82F6] hover:underline">
              View detailed reports →
            </Link>
          </section>
        )}

        {showWebsiteComplaints && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Complaints Received from Website</h2>
              {data.counts.pendingReview > 0 && (
                <Badge className="rounded-full border-0 bg-[#8B5CF6]/15 px-2.5 py-0.5 text-xs font-medium text-[#A78BFA]">
                  {data.counts.pendingReview} New
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {data.pendingComplaints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,0.2)] py-12 text-center text-sm text-[#64748B]">
                  No pending website complaints. New submissions will appear here for review.
                </div>
              ) : (
                data.pendingComplaints.map((complaint) => (
                  <PendingComplaintRow
                    key={complaint._id}
                    complaint={complaint}
                    onConfirm={() => handleConfirm(complaint)}
                    onDecline={() => {
                      setDeclineTarget(complaint);
                      setDeclineReason("");
                    }}
                    confirming={actionId === complaint._id && confirmMutation.isPending}
                    declining={actionId === complaint._id && declineMutation.isPending}
                  />
                ))
              )}
            </div>

            <p className="text-xs text-[#64748B]">
              Confirm to move complaints to{" "}
              <Link href={complaintsHref} className="text-[#3B82F6] hover:underline">
                Complaint Management
              </Link>
              . Declined complaints are also recorded there.
            </p>
          </section>
        )}
      </div>

      <Dialog open={Boolean(declineTarget)} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="border-[rgba(59,130,246,0.15)] bg-[#0B1120] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Complaint</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {declineTarget?.complaintId} — {declineTarget?.title}. This will move the record to Complaints as declined.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Optional reason for declining..."
            className="min-h-[100px] border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.6)] text-white placeholder:text-[#64748B]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)} className="border-white/10">
              Cancel
            </Button>
            <Button
              onClick={handleDecline}
              disabled={declineMutation.isPending}
              className="bg-[#EF4444] hover:bg-[#DC2626]"
            >
              {declineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
