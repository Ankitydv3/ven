// app/admin/payments/page.tsx
import { PaymentDashboardPage } from "@/components/payments/PaymentDashboardPage";

export const metadata = {
  title: "Payment Management",
  description: "Monitor collections, manage material costs, and generate professional invoices.",
};

export default function PaymentsPage() {
  return <PaymentDashboardPage />;
}