"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { glassCardClass } from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

export function ScheduleSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(glassCardClass, "p-5")}>
            <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
            <Skeleton className="mb-2 h-8 w-16 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={cn(glassCardClass, "h-[520px] p-4")}>
          <Skeleton className="mb-4 h-10 w-full rounded-xl" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className={cn(glassCardClass, "h-[520px] p-4")}>
          <Skeleton className="mb-4 h-10 w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
