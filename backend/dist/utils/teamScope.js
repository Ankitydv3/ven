"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintTeamFilter = complaintTeamFilter;
exports.orderTeamFilter = orderTeamFilter;
exports.resolveTeamQuery = resolveTeamQuery;
exports.userTeamName = userTeamName;
exports.isAdminRole = isAdminRole;
exports.isTeamRole = isTeamRole;
exports.isServiceHead = isServiceHead;
exports.isAccountant = isAccountant;
exports.taskVisibilityFilter = taskVisibilityFilter;
exports.scheduleTeamFilter = scheduleTeamFilter;
const mongoose_1 = require("mongoose");
const NO_TEAM_MATCH = { assignedTeam: "__unassigned_team__" };
function resolveTeamUserTeam(user) {
    if (user?.role !== "team" && user?.role !== "team_lead")
        return undefined;
    return user.team ?? user.teamName;
}
function userObjectId(userId) {
    if (!userId || !mongoose_1.Types.ObjectId.isValid(userId))
        return userId;
    return new mongoose_1.Types.ObjectId(userId);
}
/** Complaint / order filter for team users — strict team isolation. */
function complaintTeamFilter(user) {
    if (user?.role === "team" || user?.role === "team_lead") {
        const team = resolveTeamUserTeam(user);
        if (team) {
            return { assignedTeam: team };
        }
        return NO_TEAM_MATCH;
    }
    return {};
}
function orderTeamFilter(user) {
    const team = resolveTeamUserTeam(user);
    if (team) {
        return { assignedTeam: team };
    }
    if (user?.role === "team" || user?.role === "team_lead") {
        return NO_TEAM_MATCH;
    }
    return {};
}
function resolveTeamQuery(user, queryTeam) {
    const team = resolveTeamUserTeam(user);
    if (team) {
        return team;
    }
    return queryTeam;
}
function userTeamName(user) {
    return resolveTeamUserTeam(user);
}
function isAdminRole(role) {
    return role === "super_admin" || role === "admin" || role === "sub_admin";
}
function isTeamRole(role) {
    return role === "team" || role === "team_lead";
}
function isServiceHead(user) {
    if (!user?.role)
        return false;
    if (user.role === "super_admin" || user.role === "admin")
        return true;
    return user.role === "sub_admin" && user.subAdminType === "plant_head";
}
function isAccountant(user) {
    if (!user?.role)
        return false;
    if (user.role === "accountant")
        return true;
    if (user.role === "super_admin" || user.role === "admin")
        return true;
    return user.role === "sub_admin" && user.subAdminType === "accountant";
}
/** Task visibility filter — team users only see tasks assigned to their team. */
function taskVisibilityFilter(user) {
    if (!user || isAdminRole(user.role))
        return {};
    if (user.role === "team_lead" || user.role === "team") {
        const team = resolveTeamUserTeam(user);
        return team ? { assignedTeamName: team } : { assignedTeamName: "__none__" };
    }
    return {};
}
/** @deprecated Use taskVisibilityFilter */
function scheduleTeamFilter(user) {
    if (!isTeamRole(user?.role))
        return {};
    const team = resolveTeamUserTeam(user);
    if (user?.id && team) {
        const assigneeId = userObjectId(user.id);
        return {
            $or: [
                { assignedUserId: assigneeId },
                {
                    $and: [
                        { assignedTeamName: team },
                        { $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }] },
                    ],
                },
            ],
        };
    }
    if (user?.id) {
        return { assignedUserId: userObjectId(user.id) };
    }
    if (team) {
        return { assignedTeamName: team };
    }
    return { assignedTeamName: "__none__" };
}
