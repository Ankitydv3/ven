"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManageComplaints = canManageComplaints;
exports.canUpdateComplaintProgress = canUpdateComplaintProgress;
exports.canManageOrders = canManageOrders;
exports.canViewOrders = canViewOrders;
exports.canManageSchedules = canManageSchedules;
exports.canUpdateScheduleProgress = canUpdateScheduleProgress;
exports.canViewSchedules = canViewSchedules;
exports.canManageUsers = canManageUsers;
exports.canViewUserDirectory = canViewUserDirectory;
exports.canEditOwnProfile = canEditOwnProfile;
exports.isTeamLead = isTeamLead;
exports.isTeamMember = isTeamMember;
exports.resolveReportsScope = resolveReportsScope;
const rbac_1 = require("./rbac");
const teamScope_1 = require("./teamScope");
function canManageComplaints(role) {
    return (0, rbac_1.isAdminPortalRole)(role);
}
function canUpdateComplaintProgress(role) {
    return role === "team" || role === "team_lead";
}
function canManageOrders(role) {
    return (0, rbac_1.isAdminPortalRole)(role);
}
function canViewOrders(role) {
    return Boolean(role);
}
function canManageSchedules(role) {
    return (0, rbac_1.isAdminPortalRole)(role);
}
function canUpdateScheduleProgress(role) {
    return role === "team" || role === "team_lead";
}
function canViewSchedules(role) {
    return (0, rbac_1.isAdminPortalRole)(role) || (0, teamScope_1.isTeamRole)(role);
}
function canManageUsers(role) {
    return role === "super_admin" || role === "admin";
}
function canViewUserDirectory(role) {
    return Boolean(role);
}
function canEditOwnProfile(actor, targetUserId) {
    return actor.id === targetUserId;
}
function isTeamLead(role) {
    return role === "team_lead";
}
function isTeamMember(role) {
    return role === "team";
}
function resolveReportsScope(user, queryTeam) {
    if (!user)
        return {};
    if ((0, rbac_1.isAdminPortalRole)(user.role)) {
        return { team: queryTeam };
    }
    if (isTeamLead(user.role)) {
        const team = user.teamName ?? user.team;
        return { team: team ?? queryTeam };
    }
    if (isTeamMember(user.role)) {
        return { assignedUserId: user.id };
    }
    return { team: queryTeam };
}
