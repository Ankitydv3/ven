"use client";

import dynamic from "next/dynamic";
import { PageContentSkeleton } from "@/components/layout/page-content-skeleton";

const pageLoading = () => <PageContentSkeleton />;

export const LazyDashboardPage = dynamic(
  () => import("@/components/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
  { loading: pageLoading }
);

export const LazyComplaintsPage = dynamic(
  () => import("@/components/complaints/ComplaintsPage").then((m) => ({ default: m.ComplaintsPage })),
  { loading: pageLoading }
);

export const LazyComplaintDetailsPage = dynamic(
  () =>
    import("@/components/complaints/ComplaintDetailsPage").then((m) => ({
      default: m.ComplaintDetailsPage,
    })),
  { loading: pageLoading }
);

export const LazyOrdersPage = dynamic(
  () => import("@/components/orders/OrdersPage").then((m) => ({ default: m.OrdersPage })),
  { loading: pageLoading }
);

export const LazyMyTasksPage = dynamic(
  () => import("@/components/my-tasks/MyTasksPage").then((m) => ({ default: m.MyTasksPage })),
  { loading: pageLoading }
);

export const LazyUsersPage = dynamic(
  () => import("@/components/users/UsersPage").then((m) => ({ default: m.UsersPage })),
  { loading: pageLoading }
);

export const LazyAlertsPage = dynamic(
  () => import("@/components/alerts/AlertsPage").then((m) => ({ default: m.AlertsPage })),
  { loading: pageLoading }
);

export const LazySchedulePage = dynamic(
  () => import("@/components/schedule/SchedulePage").then((m) => ({ default: m.SchedulePage })),
  { loading: pageLoading }
);

export const LazyReportsPage = dynamic(
  () => import("@/components/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })),
  { loading: pageLoading }
);

export const LazySettingsPage = dynamic(
  () => import("@/components/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
  { loading: pageLoading }
);

export const LazyUserMaterialRequestsPage = dynamic(
  () =>
    import("@/components/material-requests/UserMaterialRequestsPage").then((m) => ({
      default: m.UserMaterialRequestsPage,
    })),
  { loading: pageLoading }
);

export const LazyClientHistoryPage = dynamic(
  () => import("@/components/history/ClientHistoryPage").then((m) => ({ default: m.ClientHistoryPage })),
  { loading: pageLoading }
);

export const LazyCustomerPage = dynamic(
  () => import("@/components/customers/customer-page").then((m) => ({ default: m.CustomerPage })),
  { loading: pageLoading }
);

export const LazyPaymentDashboardPage = dynamic(
  () =>
    import("@/components/payments/PaymentDashboardPage").then((m) => ({
      default: m.PaymentDashboardPage,
    })),
  { loading: pageLoading }
);

export const LazyPaymentAnalytics = dynamic(
  () => import("@/components/payments/PaymentAnalytics").then((m) => ({ default: m.PaymentAnalytics })),
  { loading: pageLoading }
);
