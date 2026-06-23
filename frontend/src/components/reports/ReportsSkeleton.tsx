"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="mt-2 h-3.5 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ReportsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="h-full">
      <Skeleton className="mb-5 h-4 w-44" />
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    </Card>
  );
}

export function ReportsChartSkeleton() {
  return (
    <Card className="h-full">
      <Skeleton className="mb-5 h-4 w-36" />
      <div className="flex items-center gap-6">
        <Skeleton className="h-[170px] w-[170px] flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ReportsBarChartSkeleton() {
  return (
    <Card className="h-full">
      <Skeleton className="mb-5 h-4 w-32" />
      <Skeleton className="h-[220px] w-full rounded-xl" />
    </Card>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
      <ReportsKpiSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReportsTableSkeleton rows={6} />
        </div>
        <div className="space-y-4">
          <ReportsChartSkeleton />
          <ReportsBarChartSkeleton />
        </div>
      </div>
    </div>
  );
}