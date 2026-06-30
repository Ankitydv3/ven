export const ACTIVE_COMPLAINT_SCOPE = "active_assigned" as const;

export function complaintListScope(role: "admin" | "team") {
  return role === "team" ? ACTIVE_COMPLAINT_SCOPE : "all";
}

export function buildActiveComplaintListParams(input: {
  role: "admin" | "team";
  q?: string;
  displayStatus?: string;
  page?: number;
  limit?: number;
}) {
  return {
    q: input.q || undefined,
    displayStatus: input.displayStatus && input.displayStatus !== "All" ? input.displayStatus : undefined,
    scope: complaintListScope(input.role),
    page: input.page,
    limit: input.limit,
  };
}
