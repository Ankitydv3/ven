import { Types } from "mongoose";
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

function orgScope(): DashboardScope {
  return {
    kind: "org",
    label: "Organization",
    complaintFilter: {},
    orderFilter: {},
    taskScopeFilter: {},
  };
}

/** Admin, sub-admin, and store manager share the same org-wide dashboard KPIs. */
export function usesUnifiedOrgDashboard(user?: JwtUser): boolean {
  if (!user) return true;
  return (
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.role === "sub_admin" ||
    user.role === "store_manager"
  );
}

export function resolveDashboardScope(user?: JwtUser): DashboardScope {
  if (!user || usesUnifiedOrgDashboard(user)) {
    return orgScope();
  }

  if (user.role === "accountant") {
    const assigneeId =
      user.id && Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : user.id;
    return {
      kind: "personal",
      label: user.name ?? "My work",
      complaintFilter: assigneeId ? { assignedUserId: assigneeId } : { assignedUserId: "__none__" },
      orderFilter: orderTeamFilter(user),
      taskScopeFilter: assigneeId ? { assignedUserId: assigneeId } : { assignedUserId: "__none__" },
    };
  }

  if (user.role === "team_lead" || user.role === "manager") {
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

  if (isAdminPortalRole(user.role)) {
    return orgScope();
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

export function dashboardTaskScopeFilter(user?: JwtUser): Record<string, unknown> {
  if (!user) return {};
  const scope = resolveDashboardScope(user);
  return scope.taskScopeFilter;
}
