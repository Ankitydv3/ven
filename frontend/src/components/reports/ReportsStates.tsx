"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReportsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
      </span>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
        Reports didn&apos;t load
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        We couldn&apos;t reach the reporting service. Check your connection and try again.
      </p>
      <Button
        onClick={onRetry}
        className="mt-5 h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Try again
      </Button>
    </Card>
  );
}

export function ReportsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Inbox className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </span>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}