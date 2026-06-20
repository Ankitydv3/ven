"use client";

import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-lg backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

export function ReportsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={`${glassCardClass} flex flex-col items-center justify-center text-center`}>
      <AlertCircle className="mb-3 h-10 w-10 text-[#EF4444]" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Failed to load reports
      </h3>
      <p className="mt-1 max-w-md text-sm text-[#94A3B8]">
        Unable to fetch report data from the server. Please check your connection and try again.
      </p>
      <Button onClick={onRetry} className="mt-4 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB]">
        Retry
      </Button>
    </div>
  );
}

export function ReportsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={`${glassCardClass} flex flex-col items-center justify-center py-12 text-center`}>
      <Inbox className="mb-3 h-10 w-10 text-[#64748B]" />
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[#94A3B8]">{description}</p>
    </div>
  );
}
