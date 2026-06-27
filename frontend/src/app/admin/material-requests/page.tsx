"use client";

import { Suspense } from "react";
import { UserMaterialRequestsPage } from "@/components/material-requests/UserMaterialRequestsPage";
import { Loader2 } from "lucide-react";

export default function AdminMaterialRequestsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <UserMaterialRequestsPage role="admin" />
    </Suspense>
  );
}
