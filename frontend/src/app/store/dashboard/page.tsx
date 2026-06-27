"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function StoreDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-app">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <DashboardPage role="store" />
    </Suspense>
  );
}
