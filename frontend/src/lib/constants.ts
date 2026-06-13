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
    { href: "/admin/analytics", label: "Analytics" }
  ],
  team: [{ href: "/team/dashboard", label: "My Tasks" }]
} as const;