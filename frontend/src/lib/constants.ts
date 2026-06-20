export const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"] as const;

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
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/alerts", label: "Alerts" },


  ],
  team: [
    { href: "/team/dashboard", label: "Dashboard" },
    { href: "/team/complaints", label: "My Tasks" },
    { href: "/team/customers", label: "Customers" },
  ]
} as const;