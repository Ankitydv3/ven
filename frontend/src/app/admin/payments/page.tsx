import { LazyPaymentDashboardPage } from "@/lib/lazy-pages";

export const metadata = {
  title: "Payment Management",
  description: "Monitor collections, manage material costs, and generate professional invoices.",
};

export default function PaymentsPage() {
  return <LazyPaymentDashboardPage />;
}
