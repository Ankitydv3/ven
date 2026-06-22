import type { JwtUser } from "../types";
import { isAdminPortalRole } from "./rbac";
import { complaintTeamFilter, orderTeamFilter, taskVisibilityFilter, userTeamName } from "./teamScope";

export type DashboardScopeKind = "org" | "team" | "personal";

export interface DashboardScope {
  kind: DashboardScopeKind;
  label: string;
  complaintFilter: Record<string, unknown>;
  orderFilter: Record<string, unknown>;
  taskScopeFilter: Record<string, unknown>;
  teamName?: string;
}

export function resolveDashboardScope(user?: JwtUser): DashboardScope {
  if (!user || isAdminPortalRole(user.role)) {
    return {
      kind: "org",
      label: "Organization",
      complaintFilter: {},
      orderFilter: {},
      taskScopeFilter: {},
    };
  }

  if (user.role === "team_lead" || user.role === "manager" || user.role === "accountant") {
    const team = userTeamName(user);
    if (team) {
      return {
        kind: "team",
        label: team,
        complaintFilter: user.role === "team_lead" ? complaintTeamFilter(user) : { assignedTeam: team },
        orderFilter: orderTeamFilter(user),
        taskScopeFilter: user.role === "team_lead" ? taskVisibilityFilter(user) : { assignedTeamName: team },
        teamName: team,
      };
    }
  }

  return {
    kind: "personal",
    label: user.name ?? "My work",
    complaintFilter: complaintTeamFilter(user),
    orderFilter: orderTeamFilter(user),
    taskScopeFilter: taskVisibilityFilter(user),
    teamName: userTeamName(user),
  };
}
