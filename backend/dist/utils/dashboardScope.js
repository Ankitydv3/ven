"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usesUnifiedOrgDashboard = usesUnifiedOrgDashboard;
exports.resolveDashboardScope = resolveDashboardScope;
exports.dashboardTaskScopeFilter = dashboardTaskScopeFilter;
const mongoose_1 = require("mongoose");
const rbac_1 = require("./rbac");
const teamScope_1 = require("./teamScope");
function orgScope() {
    return {
        kind: "org",
        label: "Organization",
        complaintFilter: {},
        orderFilter: {},
        taskScopeFilter: {},
    };
}
/** Admin, sub-admin, and store manager share the same org-wide dashboard KPIs. */
function usesUnifiedOrgDashboard(user) {
    if (!user)
        return true;
    return (user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "sub_admin" ||
        user.role === "store_manager");
}
function resolveDashboardScope(user) {
    if (!user || usesUnifiedOrgDashboard(user)) {
        return orgScope();
    }
    if (user.role === "accountant") {
        const assigneeId = user.id && mongoose_1.Types.ObjectId.isValid(user.id) ? new mongoose_1.Types.ObjectId(user.id) : user.id;
        return {
            kind: "personal",
            label: user.name ?? "My work",
            complaintFilter: assigneeId ? { assignedUserId: assigneeId } : { assignedUserId: "__none__" },
            orderFilter: (0, teamScope_1.orderTeamFilter)(user),
            taskScopeFilter: assigneeId ? { assignedUserId: assigneeId } : { assignedUserId: "__none__" },
        };
    }
    if (user.role === "team_lead" || user.role === "manager") {
        const team = (0, teamScope_1.userTeamName)(user);
        if (team) {
            return {
                kind: "team",
                label: team,
                complaintFilter: user.role === "team_lead" ? (0, teamScope_1.complaintTeamFilter)(user) : { assignedTeam: team },
                orderFilter: (0, teamScope_1.orderTeamFilter)(user),
                taskScopeFilter: user.role === "team_lead" ? (0, teamScope_1.taskVisibilityFilter)(user) : { assignedTeamName: team },
                teamName: team,
            };
        }
    }
    if ((0, rbac_1.isAdminPortalRole)(user.role)) {
        return orgScope();
    }
    return {
        kind: "personal",
        label: user.name ?? "My work",
        complaintFilter: (0, teamScope_1.complaintTeamFilter)(user),
        orderFilter: (0, teamScope_1.orderTeamFilter)(user),
        taskScopeFilter: (0, teamScope_1.taskVisibilityFilter)(user),
        teamName: (0, teamScope_1.userTeamName)(user),
    };
}
function dashboardTaskScopeFilter(user) {
    if (!user)
        return {};
    const scope = resolveDashboardScope(user);
    return scope.taskScopeFilter;
}
