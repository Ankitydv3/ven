"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDashboardScope = resolveDashboardScope;
const rbac_1 = require("./rbac");
const teamScope_1 = require("./teamScope");
function resolveDashboardScope(user) {
    if (!user || (0, rbac_1.isAdminPortalRole)(user.role)) {
        return {
            kind: "org",
            label: "Organization",
            complaintFilter: {},
            orderFilter: {},
            taskScopeFilter: {},
        };
    }
    if (user.role === "team_lead" || user.role === "manager" || user.role === "accountant") {
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
    return {
        kind: "personal",
        label: user.name ?? "My work",
        complaintFilter: (0, teamScope_1.complaintTeamFilter)(user),
        orderFilter: (0, teamScope_1.orderTeamFilter)(user),
        taskScopeFilter: (0, teamScope_1.taskVisibilityFilter)(user),
        teamName: (0, teamScope_1.userTeamName)(user),
    };
}
