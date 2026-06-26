"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUB_ADMIN_DEPARTMENT = exports.SUB_ADMIN_TYPES = exports.MANAGEABLE_ROLES = exports.ROLE_RANK = void 0;
exports.getRoleRank = getRoleRank;
exports.canManageRole = canManageRole;
exports.getAssignableRoles = getAssignableRoles;
exports.isSuperAdmin = isSuperAdmin;
exports.isAdminPortalRole = isAdminPortalRole;
exports.canResetOthersPassword = canResetOthersPassword;
exports.canManageUsers = canManageUsers;
exports.canCreateUsers = canCreateUsers;
exports.canDeleteUsers = canDeleteUsers;
exports.isProtectedFromDeletion = isProtectedFromDeletion;
/** Lower rank = higher privilege */
exports.ROLE_RANK = {
    super_admin: 0,
    admin: 1,
    sub_admin: 2,
    team_lead: 3,
    manager: 3,
    accountant: 2,
    team: 4,
    store_manager: 3,
    customer: 5,
};
exports.MANAGEABLE_ROLES = {
    super_admin: ["admin", "sub_admin", "team", "store_manager"],
    admin: ["admin", "sub_admin", "team", "store_manager"],
    sub_admin: ["sub_admin", "team", "store_manager"],
    team_lead: [],
    manager: [],
    accountant: [],
    store_manager: [],
    team: [],
    customer: [],
};
exports.SUB_ADMIN_TYPES = ["accountant", "plant_head"];
exports.SUB_ADMIN_DEPARTMENT = {
    accountant: "Accounts",
    plant_head: "Plant Head",
};
function getRoleRank(role) {
    return exports.ROLE_RANK[role] ?? 99;
}
function canManageRole(actorRole, targetRole) {
    if (actorRole === "super_admin")
        return true;
    if (actorRole === "admin" && targetRole === "admin")
        return true;
    return getRoleRank(actorRole) < getRoleRank(targetRole);
}
function getAssignableRoles(actorRole) {
    return exports.MANAGEABLE_ROLES[actorRole] ?? [];
}
function isSuperAdmin(role) {
    return role === "super_admin";
}
function isAdminPortalRole(role) {
    return role === "super_admin" || role === "admin" || role === "sub_admin";
}
function canResetOthersPassword(role) {
    return role === "super_admin" || role === "admin" || role === "sub_admin";
}
function canManageUsers(role) {
    return role === "super_admin" || role === "admin" || role === "sub_admin";
}
function canCreateUsers(role) {
    return canManageUsers(role);
}
function canDeleteUsers(role) {
    return role === "super_admin" || role === "admin" || role === "sub_admin";
}
function isProtectedFromDeletion(role) {
    return role === "super_admin" || role === "admin";
}
