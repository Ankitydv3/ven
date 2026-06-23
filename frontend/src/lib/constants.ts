export const complaintStatuses = [
  "All",
  "Pending Assignment",
  "Assigned",
  "In Progress",
  "Completed",
  "Declined"
] as const;

export const priorities = ["High", "Medium", "Low"] as const;

export const dashboardStatuses = ["Pending Assignment", "Assigned", "In Progress", "Completed"] as const;

export type NavItem = {
  href?: string;
  label: string;
  children?: NavItem[];
};

export const navGroups: { admin: NavItem[]; team: NavItem[]; store: NavItem[] } = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/complaints", label: "Complaints" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/material-requests", label: "Material Requests" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/users", label: "User Management" },
    { href: "/admin/settings", label: "Settings" },
  ],
  team: [
    { href: "/team/dashboard", label: "Dashboard" },
    {
      label: "Orders",
      children: [
        { href: "/team/orders", label: "All Orders" },
        { href: "/team/my-tasks", label: "My Tasks" },
      ],
    },
    { href: "/team/material-requests", label: "Material Requests" },
    { href: "/team/complaints", label: "Complaints" },
    { href: "/team/customers", label: "Customers" },
    { href: "/team/schedule", label: "Schedule" },
    { href: "/team/analytics", label: "Analytics" },
    { href: "/team/reports", label: "Reports" },
    { href: "/team/alerts", label: "Alerts" },
    { href: "/team/users", label: "User Management" },
    { href: "/team/settings", label: "Settings" },
  ],
  store: [
    { href: "/store/dashboard", label: "Dashboard" },
    { href: "/store/alerts", label: "Alerts" },
    { href: "/store/material-requests", label: "Material Requests" },
  ],
};