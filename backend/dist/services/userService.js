"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUserListScope = resolveUserListScope;
exports.resolveUserManageScope = resolveUserManageScope;
exports.resolveUserTeamScope = resolveUserTeamScope;
exports.assertCanManageUser = assertCanManageUser;
exports.createUser = createUser;
exports.getUsers = getUsers;
exports.getAssignableUsers = getAssignableUsers;
exports.resolveAssigneeById = resolveAssigneeById;
exports.getUserById = getUserById;
exports.updateUserById = updateUserById;
exports.deleteUserById = deleteUserById;
exports.resetUserPassword = resetUserPassword;
exports.changeOwnPassword = changeOwnPassword;
exports.exportUsersCSV = exportUsersCSV;
exports.generateCredentialsPdf = generateCredentialsPdf;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = require("../utils/ApiError");
const employeeId_1 = require("../utils/employeeId");
const rbac_1 = require("../utils/rbac");
const auditService_1 = require("./auditService");
const teamService_1 = require("./teamService");
function sanitizeUser(user) {
    const { password, ...rest } = user;
    return rest;
}
/** Matches users that are not soft-deleted (field missing or null). */
const NOT_DELETED_FILTER = {
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};
function buildUserFilter(options) {
    const and = [NOT_DELETED_FILTER];
    if (options.selfOnly && options.actorId) {
        return { $and: [NOT_DELETED_FILTER, { _id: options.actorId }] };
    }
    if (options.scopedTeamId) {
        and.push({ teamId: options.scopedTeamId });
    }
    else if (options.scopedTeamName) {
        and.push({
            $or: [{ teamName: options.scopedTeamName }, { team: options.scopedTeamName }],
        });
    }
    else if (options.teamId && options.teamId !== "all") {
        and.push({ teamId: options.teamId });
    }
    if (options.scopedDepartment) {
        and.push({ department: options.scopedDepartment });
    }
    if (options.role && options.role !== "all") {
        and.push({ role: options.role });
    }
    if (options.status && options.status !== "all") {
        and.push({ status: options.status });
    }
    if (options.q) {
        and.push({
            $or: [
                { name: { $regex: options.q, $options: "i" } },
                { email: { $regex: options.q, $options: "i" } },
                { employeeId: { $regex: options.q, $options: "i" } },
                { username: { $regex: options.q, $options: "i" } },
                { mobile: { $regex: options.q, $options: "i" } },
                { teamName: { $regex: options.q, $options: "i" } },
                { designation: { $regex: options.q, $options: "i" } },
            ],
        });
    }
    return and.length === 1 ? and[0] : { $and: and };
}
function resolveUserListScope(_user) {
    // All users can browse the full user directory (manage actions are RBAC-gated separately).
    return {};
}
/** Scope for modifying another user's record (not self-service profile updates). */
function resolveUserManageScope(user) {
    if (!user)
        return {};
    if (user.role === "super_admin" || user.role === "admin" || user.role === "sub_admin") {
        return {};
    }
    return { selfOnly: true, actorId: user.id };
}
function resolveUserTeamScope(user) {
    if (!user)
        return undefined;
    if (user.role === "super_admin" || user.role === "admin" || user.role === "sub_admin")
        return undefined;
    if (user.teamId)
        return user.teamId;
    return undefined;
}
function assertCanManageUser(actor, targetRole) {
    if (!(0, rbac_1.canManageRole)(actor.role, targetRole)) {
        throw new ApiError_1.ApiError(403, "You cannot manage users with this role");
    }
    const assignable = (0, rbac_1.getAssignableRoles)(actor.role);
    if (assignable.length > 0 && !assignable.includes(targetRole)) {
        throw new ApiError_1.ApiError(403, "You cannot assign this role");
    }
}
async function assertUniqueContact(email, mobile, excludeId) {
    if (email) {
        const duplicateEmail = await User_1.default.findOne({
            email: email.toLowerCase(),
            ...NOT_DELETED_FILTER,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        });
        if (duplicateEmail) {
            throw new ApiError_1.ApiError(409, "Email already registered");
        }
    }
    if (mobile) {
        const duplicateMobile = await User_1.default.findOne({
            mobile: mobile.trim(),
            ...NOT_DELETED_FILTER,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        });
        if (duplicateMobile) {
            throw new ApiError_1.ApiError(409, "Phone number already registered");
        }
    }
}
function assertTeamAssignment(role, teamName) {
    if (role === "team" && !teamName?.trim()) {
        throw new ApiError_1.ApiError(400, "Team assignment is required for team users");
    }
}
async function teamFieldsFromDb(teamName) {
    if (!teamName?.trim())
        return {};
    return (0, teamService_1.getTeamFields)(teamName);
}
function roleProfileDefaults(role, subAdminType) {
    switch (role) {
        case "team":
            return { designation: "Team Lead", department: "Operations" };
        case "admin":
            return { designation: "System Administrator", department: "Director" };
        case "sub_admin":
            return {
                designation: subAdminType === "accountant"
                    ? "Accountant"
                    : subAdminType === "plant_head"
                        ? "Plant Head"
                        : "Sub Administrator",
                department: subAdminType ? rbac_1.SUB_ADMIN_DEPARTMENT[subAdminType] : "",
            };
        case "manager":
            return { designation: "Product Manager", department: "Production" };
        default:
            return { designation: "", department: "" };
    }
}
async function createUser(payload, actor) {
    assertCanManageUser(actor, payload.role);
    assertTeamAssignment(payload.role, payload.teamName);
    await assertUniqueContact(payload.email, payload.mobile);
    const employeeId = await (0, employeeId_1.generateEmployeeId)();
    const teamSlug = payload.teamName ? (0, employeeId_1.teamNameToSlug)(payload.teamName) : "general";
    const username = (0, employeeId_1.generateUsername)(teamSlug, employeeId);
    const hashedPassword = await bcryptjs_1.default.hash(payload.password, 10);
    const teamAssignment = await teamFieldsFromDb(payload.teamName);
    const profileDefaults = roleProfileDefaults(payload.role, payload.subAdminType);
    const user = await User_1.default.create({
        employeeId,
        username,
        name: payload.name.trim(),
        email: payload.email.toLowerCase().trim(),
        mobile: payload.mobile.trim(),
        password: hashedPassword,
        role: payload.role,
        status: "active",
        createdBy: actor.name ?? "Admin",
        ...(payload.subAdminType ? { subAdminType: payload.subAdminType } : {}),
        ...profileDefaults,
        ...teamAssignment,
    });
    return {
        user: sanitizeUser(user.toObject()),
    };
}
async function getUsers(options) {
    const filter = buildUserFilter(options);
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const [items, total] = await Promise.all([
        User_1.default.find(filter).select("-password").sort(sort).skip(skip).limit(options.limit),
        User_1.default.countDocuments(filter),
    ]);
    return { items, total };
}
async function getAssignableUsers(actor) {
    if (!(0, rbac_1.isAdminPortalRole)(actor.role)) {
        throw new ApiError_1.ApiError(403, "You do not have permission to assign tasks");
    }
    const items = await User_1.default.find({
        ...NOT_DELETED_FILTER,
        status: "active",
        role: { $in: ["team", "team_lead"] },
        $or: [
            { teamName: { $exists: true, $nin: [null, ""] } },
            { team: { $exists: true, $nin: [null, ""] } },
        ],
    })
        .select("-password")
        .sort({ name: 1 });
    return items;
}
async function resolveAssigneeById(userId) {
    const assignee = await User_1.default.findOne({
        $and: [{ _id: userId }, NOT_DELETED_FILTER, { status: "active" }],
    });
    if (!assignee) {
        throw new ApiError_1.ApiError(404, "Assigned user not found or inactive");
    }
    if (!["team", "team_lead"].includes(assignee.role)) {
        throw new ApiError_1.ApiError(400, "Complaints can only be assigned to team users");
    }
    const team = assignee.teamName ?? assignee.team;
    if (!team) {
        throw new ApiError_1.ApiError(400, "This user has no team. Edit them in User Management and assign a team first.");
    }
    return {
        assignedUserId: assignee._id,
        assignedUserName: assignee.name,
        team,
    };
}
async function getUserById(id, _actor) {
    const user = await User_1.default.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] }).select("-password");
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    return user;
}
function optionalString(value) {
    return value ?? undefined;
}
async function updateUserById(id, payload, actor) {
    const existing = await User_1.default.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] });
    if (!existing) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    const isSelfUpdate = actor.id === id;
    if (!isSelfUpdate) {
        const scope = resolveUserManageScope(actor);
        if (scope.selfOnly) {
            throw new ApiError_1.ApiError(403, "You can only update your own profile");
        }
        if (scope.scopedDepartment && existing.department !== scope.scopedDepartment) {
            throw new ApiError_1.ApiError(403, "User not in your department scope");
        }
        if (!(0, rbac_1.canManageRole)(actor.role, existing.role)) {
            throw new ApiError_1.ApiError(403, "You cannot modify this user");
        }
    }
    if (payload.role && !(0, rbac_1.canManageRole)(actor.role, payload.role)) {
        throw new ApiError_1.ApiError(403, "You cannot assign this role");
    }
    if (payload.email || payload.mobile) {
        await assertUniqueContact(payload.email, payload.mobile, id);
    }
    if (payload.role) {
        assertCanManageUser(actor, payload.role);
        assertTeamAssignment(payload.role, payload.teamName ?? optionalString(existing.teamName) ?? optionalString(existing.team));
    }
    const effectiveRole = payload.role ?? existing.role;
    const effectiveTeamName = payload.teamName ?? optionalString(existing.teamName) ?? optionalString(existing.team);
    if (effectiveRole === "team") {
        assertTeamAssignment(effectiveRole, effectiveTeamName);
    }
    const update = {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
        ...(payload.mobile ? { mobile: payload.mobile.trim() } : {}),
        ...(!isSelfUpdate && payload.role ? { role: payload.role } : {}),
        ...(!isSelfUpdate && payload.status ? { status: payload.status } : {}),
        ...(!isSelfUpdate && payload.teamName ? await teamFieldsFromDb(payload.teamName) : {}),
    };
    const user = await User_1.default.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select("-password");
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    return user;
}
async function deleteUserById(id, actor) {
    const user = await User_1.default.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] });
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    if ((0, rbac_1.isProtectedFromDeletion)(user.role)) {
        throw new ApiError_1.ApiError(403, "Cannot delete this account");
    }
    if (!(0, rbac_1.canManageRole)(actor.role, user.role)) {
        throw new ApiError_1.ApiError(403, "You cannot delete this user");
    }
    const scope = resolveUserManageScope(actor);
    if (scope.scopedDepartment && user.department !== scope.scopedDepartment) {
        throw new ApiError_1.ApiError(403, "User not in your department scope");
    }
    user.deletedAt = new Date();
    user.status = "disabled";
    await user.save();
    await (0, auditService_1.logAuditEvent)({
        action: "user_soft_delete",
        changedBy: actor.id,
        changedByName: actor.name,
        targetUser: user._id,
        targetUserName: user.name,
    });
    return sanitizeUser(user.toObject());
}
async function resetUserPassword(userId, password, actor) {
    const user = await User_1.default.findOne({ $and: [{ _id: userId }, NOT_DELETED_FILTER] });
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    if (!(0, rbac_1.canManageRole)(actor.role, user.role)) {
        throw new ApiError_1.ApiError(403, "You cannot reset password for this user");
    }
    const scope = resolveUserManageScope(actor);
    if (scope.scopedDepartment && user.department !== scope.scopedDepartment) {
        throw new ApiError_1.ApiError(403, "User not in your department scope");
    }
    user.password = await bcryptjs_1.default.hash(password, 10);
    await user.save();
    await (0, auditService_1.logAuditEvent)({
        action: "password_reset",
        changedBy: actor.id,
        changedByName: actor.name,
        targetUser: user._id,
        targetUserName: user.name,
        details: { changedAt: new Date().toISOString() },
    });
    return { message: "Password reset successfully" };
}
async function changeOwnPassword(userId, newPassword) {
    const user = await User_1.default.findOne({ $and: [{ _id: userId }, NOT_DELETED_FILTER] });
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    user.password = await bcryptjs_1.default.hash(newPassword, 10);
    await user.save();
    await (0, auditService_1.logAuditEvent)({
        action: "password_change_self",
        changedBy: user._id,
        changedByName: user.name,
        targetUser: user._id,
        targetUserName: user.name,
    });
    return { message: "Password changed successfully" };
}
async function exportUsersCSV(options) {
    const filter = buildUserFilter(options);
    const users = await User_1.default.find(filter).select("-password").sort({ createdAt: -1 });
    const headers = [
        "Employee ID",
        "Username",
        "Name",
        "Email",
        "Mobile",
        "Role",
        "Sub Admin Type",
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
        user.subAdminType ?? "",
        user.teamName ?? user.team ?? "",
        user.department,
        user.designation,
        user.status,
        user.createdBy,
        user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : "",
    ]);
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    let csv = headers.map(escape).join(",") + "\n";
    for (const row of rows) {
        csv += row.map(escape).join(",") + "\n";
    }
    return csv;
}
async function generateCredentialsPdf(credentials) {
    const { PDFDocument, rgb, StandardFonts } = await Promise.resolve().then(() => __importStar(require("pdf-lib")));
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 420]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const lines = [
        { text: "Employee Login Credentials", font: boldFont, size: 18, y: 360 },
        { text: `Name: ${credentials.name}`, font, size: 12, y: 310 },
        { text: `Employee ID: ${credentials.employeeId}`, font, size: 12, y: 285 },
        { text: `Username: ${credentials.username}`, font, size: 12, y: 260 },
        { text: `Temporary Password: ${credentials.temporaryPassword}`, font, size: 12, y: 235 },
        { text: "Please change your password after first login.", font, size: 10, y: 200 },
    ];
    for (const line of lines) {
        page.drawText(line.text, {
            x: 50,
            y: line.y,
            size: line.size,
            font: line.font,
            color: rgb(0.1, 0.1, 0.1),
        });
    }
    return pdfDoc.save();
}
