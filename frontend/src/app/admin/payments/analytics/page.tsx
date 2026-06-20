// app/admin/payments/analytics/page.tsx
import { PaymentAnalytics } from "@/components/payments/PaymentAnalytics";

export const metadata = {
  title: "Payment Analytics",
  description: "Deep dive into revenue trends, collection modes, and team performance.",
};

export default function PaymentAnalyticsPage() {
  return <PaymentAnalytics />;
}