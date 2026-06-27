export const APP_BG = "#020a17";

export const complaintStatuses = [
  "All",
  "Pending Review",
  "Pending Assignment",
  "Assigned",
  "In Progress",
  "Site Visit",
  "Material Required",
  "Material Granted",
  "Revisit",
  "Completed",
  "Cancelled",
  "Declined"
] as const;

export const priorities = ["High", "Medium", "Low"] as const;

export const complaintIssueTypes = [
  
  "Difficulty in moving",
  "Locking Issue",
  "Leakage Issue",
  "Alignment issue",
  "Other",
] as const;

export type ComplaintIssueType = (typeof complaintIssueTypes)[number];

export const dashboardStatuses = ["Pending Assignment", "Assigned", "In Progress", "Completed"] as const;

export type NavItem = {
  href?: string;
  label: string;
  children?: NavItem[];
};

export const navGroups: { admin: NavItem[]; team: NavItem[]; store: NavItem[] } = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    
    { href: "/admin/complaints", label: "Complaints" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/alerts", label: "Alerts" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/material-requests", label: "Material Requests" },
    { href: "/admin/history", label: "Client History" },
    { href: "/admin/users", label: "User Management" },
    { href: "/admin/settings", label: "Settings" },
  ],
  team: [
    { href: "/team/dashboard", label: "Dashboard" },
    
    { href: "/team/complaints", label: "Complaints" },
     { href: "/team/my-tasks", label: "My Tasks" },
    { href: "/team/material-requests", label: "Material Requests" },
    { href: "/team/history", label: "Client History" },
    { href: "/team/reports", label: "Reports" },
    { href: "/team/alerts", label: "Alerts" },
    { href: "/team/schedule", label: "Schedule" },
    { href: "/team/users", label: "User Management" },
    { href: "/team/settings", label: "Settings" },
  ],
  store: [
    { href: "/store/dashboard", label: "Dashboard" },
    { href: "/store/alerts", label: "Alerts" },
    { href: "/store/material-requests", label: "Material Requests" },
    { href: "/store/settings", label: "Settings" },
  ],
};