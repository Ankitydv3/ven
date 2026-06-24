"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { glassCardClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

interface CustomerPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function CustomerPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: CustomerPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        glassCardClass,
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <p className="text-sm text-slate-500 dark:text-white/50">
        Showing{" "}
        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
          {startItem}
        </span>
        {" – "}
        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
          {endItem}
        </span>
        {" of "}
        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
          {total}
        </span>
        {" customers"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-9 rounded-xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-app/60"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="min-w-[72px] text-center text-sm font-medium tabular-nums text-slate-900 dark:text-white">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-9 rounded-xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-app/60"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
