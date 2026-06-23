"use client";

import { motion } from "framer-motion";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ReportsEmptyState } from "./ReportsStates";
import type { FeedbackItem, UserFeedbackRow } from "@/services/reportService";

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-[#3B82F6]/5 backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-[#64748B]">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      whileHover={{ scale: 1.01 }}
      className={cn("h-full", glassCardClass)}
    >
      <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Feedback by Team Member
      </h3>
      {data.length === 0 ? (
        <ReportsEmptyState
          title="No feedback data"
          description="Customer ratings will appear here after complaints are completed."
        />
      ) : (
        <div className="overflow-x-auto">
          <TableElement>
            <THead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-[#071B31]/95">
              <tr>
                <TH className="whitespace-nowrap text-[#64748B]">Team Member</TH>
                {showTeam && <TH className="whitespace-nowrap text-[#64748B]">Team</TH>}
                <TH className="whitespace-nowrap text-right text-[#64748B]">Total</TH>
                <TH className="whitespace-nowrap text-right text-[#22C55E]">Positive</TH>
                <TH className="whitespace-nowrap text-right text-[#EF4444]">Negative</TH>
                <TH className="whitespace-nowrap text-right text-[#64748B]">Avg Rating</TH>
              </tr>
            </THead>
            <tbody>
              {data.map((row) => (
                <TR key={`${row.userName}-${row.team}`} className="transition-colors hover:bg-[#3B82F6]/5">
                  <TD className="font-medium text-slate-900 dark:text-white">{row.userName}</TD>
                  {showTeam && <TD className="text-[#94A3B8]">{row.team || "—"}</TD>}
                  <TD className="text-right text-slate-900 dark:text-white">{row.totalFeedback}</TD>
                  <TD className="text-right text-[#22C55E]">{row.positiveCount}</TD>
                  <TD className="text-right text-[#EF4444]">{row.negativeCount}</TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StarRating rating={row.averageRating} />
                      <span className="text-sm text-[#94A3B8]">{row.averageRating || "—"}</span>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </TableElement>
        </div>
      )}
    </motion.div>
  );
}

interface FeedbackListProps {
  title: string;
  items: FeedbackItem[];
  variant: "positive" | "negative";
}

export function FeedbackList({ title, items, variant }: FeedbackListProps) {
  const Icon = variant === "positive" ? ThumbsUp : ThumbsDown;
  const accentColor = variant === "positive" ? "text-[#22C55E]" : "text-[#EF4444]";
  const borderColor =
    variant === "positive"
      ? "border-[#22C55E]/20"
      : "border-[#EF4444]/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className={cn("h-full", glassCardClass, borderColor)}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn("h-5 w-5", accentColor)} />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span className={cn("ml-auto text-sm font-semibold", accentColor)}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <ReportsEmptyState
          title={`No ${variant} feedback`}
          description="Customer ratings will appear here once submitted."
        />
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.feedbackId}
              className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-3 dark:border-[rgba(59,130,246,0.1)] dark:bg-[rgba(10,20,35,0.5)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {item.complaintId} · {item.assignedUserName}
                  </p>
                </div>
                <StarRating rating={item.rating} />
              </div>
              {item.comment && (
                <p className="mt-2 text-sm text-[#94A3B8]">&ldquo;{item.comment}&rdquo;</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
