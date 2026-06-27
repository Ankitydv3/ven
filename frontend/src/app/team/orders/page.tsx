"use client";

import { Suspense } from "react";
import { OrdersPage } from "@/components/orders/OrdersPage";
import { Loader2 } from "lucide-react";

export default function TeamOrdersPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <OrdersPage role="team" />
    </Suspense>
  );
}
