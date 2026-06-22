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

export const navGroups = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/complaints", label: "Complaints" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/users", label: "User Management" },
    { href: "/admin/settings", label: "Settings" },
  ],
  team: [
    { href: "/team/dashboard", label: "Dashboard" },
    { href: "/team/orders", label: "Orders" },
    { href: "/team/complaints", label: "Complaints" },
    { href: "/team/customers", label: "Customers" },
    { href: "/team/schedule", label: "Schedule" },
    { href: "/team/analytics", label: "Analytics" },
    { href: "/team/reports", label: "Reports" },
    { href: "/team/alerts", label: "Alerts" },
    { href: "/team/members", label: "Team Members" },
    { href: "/team/settings", label: "Settings" },
  ]
} as const;