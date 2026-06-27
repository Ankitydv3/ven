"use client";

import { format } from "date-fns";
import { Calendar, Eye, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientHistoryComplaintSummary } from "@/services/complaints";
import {
  getHistoryCardAccent,
  getHistoryStatusBadgeClass,
  priorityBadgeClass,
} from "@/components/history/client-history-styles";
import { cn } from "@/lib/utils";

export function ClientHistoryComplaintCard({
  complaint,
  onView,
}: {
  complaint: ClientHistoryComplaintSummary;
  onView: (complaintId: string) => void;
}) {
  const receivedDate = complaint.createdAt
    ? format(new Date(complaint.createdAt), "dd MMM yyyy")
    : "—";

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border border-l-4 bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/[0.03] dark:border-white/10",
        getHistoryCardAccent(complaint.workflowStage)
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
            {complaint.complaintId}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {receivedDate}
          </p>
        </div>
        <Badge
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            getHistoryStatusBadgeClass(complaint.workflowStage)
          )}
        >
          {complaint.workflowStage}
        </Badge>
      </div>

      <div className="flex-1 space-y-2.5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Customer
          </p>
          <p className="truncate text-sm font-medium text-foreground">{complaint.clientName}</p>
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Complaint Type
          </p>
          <p className="line-clamp-2 text-sm text-foreground/90">{complaint.complaintType}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border text-[10px]",
              priorityBadgeClass[complaint.priority] ?? priorityBadgeClass.Medium
            )}
          >
            {complaint.priority} Priority
          </Badge>
          {complaint.assignedTeam && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {complaint.assignedTeam}
            </span>
          )}
        </div>

        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{complaint.location || "—"}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full rounded-xl border-border bg-background/50 group-hover:border-blue-500/40 group-hover:bg-blue-500/10 dark:border-white/10 dark:bg-white/[0.03]"
        onClick={(e) => {
          e.stopPropagation();
          onView(complaint.complaintId);
        }}
      >
        <Eye className="mr-2 h-4 w-4" />
        View Details
      </Button>
    </article>
  );
}
