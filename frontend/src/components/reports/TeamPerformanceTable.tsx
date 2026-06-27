"use client";

import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Card, SectionHeading } from "@/components/ui/card";
import { ReportsEmptyState } from "./ReportsStates";

export interface TeamPerformanceRow {
  team: string;
  
  teamColor: string;
  tasksAssigned: number;
  completed: number;
  completionRate: string;
  isTotal?: boolean;
}

interface TeamPerformanceTableProps {
  data: TeamPerformanceRow[];
}

export function TeamPerformanceTable({ data }: TeamPerformanceTableProps) {
  const rows = data.filter((row) => !row.isTotal);

  return (
    <Card delay={0} className="flex h-full flex-col">
      <SectionHeading title="Team Performance" description="Assigned, completed, and completion rate by team" />
      {rows.length === 0 ? (
        <ReportsEmptyState
          title="No team performance data"
          description="No task assignments found for the selected filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <TableElement>
            <THead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <TH className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Team
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Assigned
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Completed
                </TH>
                <TH className="whitespace-nowrap text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Completion Rate
                </TH>
              </tr>
            </THead>
            <tbody>
              {data.map((row) => (
                <TR
                  key={row.team}
                  className={cn(
                    "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors hover:bg-white/[0.04]",
                    row.isTotal && "border-t-2 border-slate-200 bg-slate-50/80 font-semibold dark:border-slate-700 dark:bg-slate-800/30"
                  )}
                >
                  <TD className="py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: row.isTotal ? "#64748B" : row.teamColor }}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          row.isTotal ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"
                        )}
                      >
                        {row.team}
                      </span>
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.tasksAssigned.toLocaleString()}
                  </TD>
                  <TD className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.completed.toLocaleString()}
                  </TD>
                  <TD className="text-right tabular-nums font-medium text-slate-900 dark:text-white">
                    {row.completionRate}
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
