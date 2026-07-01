"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type DashboardMeta = {
  title: string;
  subtitle: string;
};

type DashboardLayoutContextValue = {
  inLayout: boolean;
  setMeta: (meta: DashboardMeta) => void;
};

export const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

const ROUTE_META: Record<string, DashboardMeta> = {
  "/admin/dashboard": {
    title: "Dashboard",
    subtitle: "Real-time operational metrics and performance overview.",
  },
  "/admin/complaints": {
    title: "Complaints",
    subtitle: "Manage and assign complaints to service teams.",
  },
  "/admin/orders": {
    title: "Orders Management",
    subtitle: "Track material types, client orders, service availability, and workflow lifecycles.",
  },
  "/admin/orders/new": {
    title: "Create Order",
    subtitle: "Fill in customer details and order specifications to register a new order.",
  },
  "/admin/payments": {
    title: "Payment Management",
    subtitle: "Monitor collections, manage material costs, and generate professional invoices.",
  },
  "/admin/payments/analytics": {
    title: "Financial Analytics",
    subtitle: "Deep dive into revenue trends, collection modes, and team performance.",
  },
  "/admin/reports": {
    title: "Reports",
    subtitle: "Performance overview of all service teams",
  },
  "/admin/alerts": {
    title: "Alerts",
    subtitle: "Live overview of team tasks and incoming complaints.",
  },
  "/admin/schedule": {
    title: "Schedule",
    subtitle: "Plan and monitor field tasks across teams.",
  },
  "/admin/material-requests": {
    title: "Material Requests",
    subtitle: "Review and approve material requests from teams.",
  },
  "/admin/history": {
    title: "Client History",
    subtitle: "Search by phone number, complaint ID, or order ID",
  },
  "/admin/users": {
    title: "User Management",
    subtitle: "Manage users, roles, and access permissions",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "Manage your profile picture, account details, and security",
  },
  "/admin/analytics": {
    title: "Analytics Dashboard",
    subtitle: "Organization-wide performance insights",
  },
  "/admin/customers": {
    title: "Customers",
    subtitle: "View and manage customer details",
  },
  "/team/dashboard": {
    title: "Dashboard",
    subtitle: "Real-time operational metrics and performance overview.",
  },
  "/team/complaints": {
    title: "Complaints",
    subtitle: "Manage and assign complaints to service teams.",
  },
  "/team/my-tasks": {
    title: "My Tasks",
    subtitle: "Active complaints assigned to you or your team",
  },
  "/team/material-requests": {
    title: "Material Requests",
    subtitle: "Track and submit material requests for your tasks.",
  },
  "/team/history": {
    title: "Client History",
    subtitle: "Search by phone number, complaint ID, or order ID",
  },
  "/team/reports": {
    title: "Reports",
    subtitle: "Your team's performance overview",
  },
  "/team/alerts": {
    title: "Alerts",
    subtitle: "Live overview of team tasks and incoming complaints.",
  },
  "/team/schedule": {
    title: "Schedule",
    subtitle: "Plan and monitor your team's field tasks.",
  },
  "/team/users": {
    title: "User Management",
    subtitle: "View the organization user directory",
  },
  "/team/settings": {
    title: "Settings",
    subtitle: "Manage your profile picture, account details, and security",
  },
  "/team/analytics": {
    title: "My Analytics",
    subtitle: "Team performance insights",
  },
  "/store/dashboard": {
    title: "Dashboard",
    subtitle: "Material requests waiting for your action",
  },
  "/store/alerts": {
    title: "Material Management",
    subtitle: "Handle alerts and material requests efficiently.",
  },
  "/store/material-requests": {
    title: "Material Requests",
    subtitle: "Review and fulfill material requests.",
  },
  "/store/settings": {
    title: "Settings",
    subtitle: "Manage your profile picture, account details, and security",
  },
};

export function getDefaultRouteMeta(pathname: string): DashboardMeta {
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname];
  }

  if (pathname.includes("/complaints/")) {
    return {
      title: "Complaint Details",
      subtitle: "Comprehensive view of complaint details, history, and status.",
    };
  }

  return {
    title: "Complaint Flow OS",
    subtitle: "Operations portal",
  };
}

export function useDashboardMeta(meta: DashboardMeta) {
  const ctx = useContext(DashboardLayoutContext);
  const setMeta = ctx?.setMeta;
  const inLayout = ctx?.inLayout;

  useEffect(() => {
    if (inLayout && setMeta) {
      setMeta(meta);
    }
  }, [inLayout, setMeta, meta.title, meta.subtitle]);
}

export function DashboardLayoutProvider({
  children,
  renderShell,
}: {
  children: ReactNode;
  renderShell: (meta: DashboardMeta, children: ReactNode) => ReactNode;
}) {
  const pathname = usePathname();
  const [meta, setMetaState] = useState<DashboardMeta>(() => getDefaultRouteMeta(pathname));

  const setMeta = useCallback((next: DashboardMeta) => {
    setMetaState((prev) =>
      prev.title === next.title && prev.subtitle === next.subtitle ? prev : next
    );
  }, []);

  useEffect(() => {
    setMeta(getDefaultRouteMeta(pathname));
  }, [pathname, setMeta]);

  const contextValue = useMemo(
    () => ({ inLayout: true as const, setMeta }),
    [setMeta]
  );

  return (
    <DashboardLayoutContext.Provider value={contextValue}>
      {renderShell(meta, children)}
    </DashboardLayoutContext.Provider>
  );
}
