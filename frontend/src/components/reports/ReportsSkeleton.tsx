"use client";

import { Skeleton } from "@/components/ui/skeleton";

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-[#3B82F6]/5 backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

export function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className={glassCardClass}>
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function ReportsTableSkeleton() {
  return (
    <div className={glassCardClass}>
      <Skeleton className="mb-4 h-5 w-48" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function ReportsChartSkeleton() {
  return (
    <div className={glassCardClass}>
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
    </div>
  );
}

export function ReportsBarChartSkeleton() {
  return (
    <div className={glassCardClass}>
      <Skeleton className="mb-4 h-5 w-36" />
      <Skeleton className="h-[240px] w-full rounded-xl" />
    </div>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <ReportsKpiSkeleton />
      <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportsTableSkeleton />
        <ReportsChartSkeleton />
        <ReportsBarChartSkeleton />
      </div>
    </div>
  );
}
