"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StoreManagerPage } from "@/components/material-requests/StoreManagerPage";

export default function StoreMaterialRequestsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-app">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <StoreManagerPage view="requests" />
    </Suspense>
  );
}
