import { LazyPaymentAnalytics } from "@/lib/lazy-pages";

export const metadata = {
  title: "Payment Analytics",
  description: "Deep dive into revenue trends, collection modes, and team performance.",
};

export default function PaymentAnalyticsPage() {
  return <LazyPaymentAnalytics />;
}
