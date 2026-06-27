"use client";

import { useRouter } from "next/navigation";
import { getComplaintDetailsPath } from "@/lib/record-navigation";
import { Star, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportsEmptyState } from "./ReportsStates";
import type { FeedbackItem, UserFeedbackRow } from "@/services/reportService";

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-sm text-slate-400 dark:text-slate-500">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-slate-300 dark:text-slate-700"
          )}
        />
      ))}
    </div>
  );
}

interface UserFeedbackTableProps {
  data: UserFeedbackRow[];
  showTeam?: boolean;
}

export function UserFeedbackTable({ data, showTeam = true }: UserFeedbackTableProps) {
  return (
    <Card delay={0} className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Feedback by Team Member
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Volume and rating per agent
        </p>
      </div>
      {data.length === 0 ? (
        <ReportsEmptyState
          title="No feedback data"
          description="Customer ratings will appear here after complaints are completed."
        />
      ) : (
        <div className="overflow-x-auto">
          <TableElement>
            <THead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <TH className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Team Member
                </TH>
                {showTeam && (
                  <TH className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Team
                  </TH>
                )}
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Positive
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  Negative
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Avg Rating
                </TH>
              </tr>
            </THead>
            <tbody>
              {data.map((row) => (
                <TR
                  key={`${row.userName}-${row.team}`}
                  className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <TD className="py-3 font-medium text-slate-900 dark:text-white">{row.userName}</TD>
                  {showTeam && <TD className="text-slate-500 dark:text-slate-400">{row.team || "—"}</TD>}
                  <TD className="text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {row.totalFeedback}
                  </TD>
                  <TD className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.positiveCount}
                  </TD>
                  <TD className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {row.negativeCount}
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StarRating rating={row.averageRating} />
                      <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                        {row.averageRating || "—"}
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableElement>
        </div>
      )}

    </Card>
  );
}

interface FeedbackListProps {
  title: string;
  items: FeedbackItem[];
  variant: "positive" | "negative";
}

export function FeedbackList({ title, items, variant }: FeedbackListProps) {
  const router = useRouter();
  const isPositive = variant === "positive";
  const Icon = isPositive ? ThumbsUp : ThumbsDown;

  return (
    <Card accent={isPositive ? "emerald" : "rose"} delay={isPositive ? 0.05 : 0.1} className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2 pl-1.5">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg",
            isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")} />
        </span>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            isPositive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
          )}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <ReportsEmptyState
          title={`No ${variant} feedback`}
          description="Customer ratings will appear here once submitted."
        />
      ) : (
        <div className="max-h-80 space-y-2.5 overflow-y-auto pl-1.5 pr-1 custom-scrollbar">
          {items.map((item) => (
            <div
              key={item.feedbackId}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/30 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04]"
              onClick={() => {
                if (item.complaintId) {
                  router.push(getComplaintDetailsPath("admin", item.complaintId));
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.customerName}</p>
                    <Eye className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.complaintId} · {item.assignedUserName}
                  </p>
                </div>
                <StarRating rating={item.rating} />
              </div>
              {item.comment && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">&ldquo;{item.comment}&rdquo;</p>
              )}
            </div>
          ))}
        </div>
      )}

    </Card>
  );
}
