export const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"] as const;

export const complaintStatuses = [
  "All",
  "Pending Assignment",
  "Assigned",
  "In Progress",
  "Completed"
] as const;

export const priorities = ["High", "Medium", "Low"] as const;

export const dashboardStatuses = ["Pending Assignment", "Assigned", "In Progress", "Completed"] as const;

export const navGroups = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/complaints", label: "Complaints" },
    { href: "/admin/analytics", label: "Analytics" },
        { href: "/admin/orders", label: "Orders" },
    { href: "/admin/complaints", label: "Complaints" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/inventory", label: "Inventory" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/settings", label: "Settings" },
  ],
  team: [
    { href: "/team/dashboard", label: "My Tasks" },
    { href: "/team/orders", label: "Orders" },
    { href: "/team/complaints", label: "Complaints" },
    { href: "/team/customers", label: "Customers" },
    { href: "/team/services", label: "Services" },
    { href: "/team/schedule", label: "Schedule" },
    { href: "/team/inventory", label: "Inventory" },
    { href: "/team/reports", label: "Reports" },
    { href: "/team/alerts", label: "Alerts" },
    { href: "/team/settings", label: "Settings" },
  ]
} as const;