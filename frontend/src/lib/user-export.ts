import type { ManagedUser } from "@/lib/types";

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportUsersToExcel(users: ManagedUser[]) {
  const headers = [
    "Employee ID",
    "Username",
    "Name",
    "Email",
    "Mobile",
    "Role",
    "Team",
    "Department",
    "Designation",
    "Status",
    "Created By",
    "Created Date",
  ];

  const rows = users.map((user) => [
    user.employeeId ?? "",
    user.username ?? "",
    user.name,
    user.email,
    user.mobile,
    user.role,
    user.teamName ?? user.team ?? "",
    user.department,
    user.designation,
    user.status,
    user.createdBy,
    user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "",
  ]);

  const tableRows = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([tableRows], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, `users-export-${Date.now()}.xls`);
}

export function buildCredentialsText(credentials: {
  employeeId: string;
  username: string;
  temporaryPassword: string;
}) {
  return [
    "Employee Login Credentials",
    `Employee ID: ${credentials.employeeId}`,
    `Username: ${credentials.username}`,
    `Temporary Password: ${credentials.temporaryPassword}`,
  ].join("\n");
}
