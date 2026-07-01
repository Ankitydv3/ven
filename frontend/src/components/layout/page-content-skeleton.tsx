import { Skeleton } from "@/components/ui/skeleton";

export function PageContentSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 bg-white/5" />
        ))}
      </div>
      <Skeleton className="h-14 bg-white/5" />
      <Skeleton className="h-[420px] bg-white/5" />
    </div>
  );
}
