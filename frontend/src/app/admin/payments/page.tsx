// app/admin/payments/page.tsx
import { Suspense } from "react";
import { PaymentDashboardPage } from "@/components/payments/PaymentDashboardPage";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Payment Management",
  description: "Monitor collections, manage material costs, and generate professional invoices.",
};

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <PaymentDashboardPage />
    </Suspense>
  );
}
