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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserHandler = createUserHandler;
exports.listUsers = listUsers;
exports.listAssignableUsers = listAssignableUsers;
exports.readUser = readUser;
exports.updateUserHandler = updateUserHandler;
exports.deleteUserHandler = deleteUserHandler;
exports.resetPasswordHandler = resetPasswordHandler;
exports.exportUsersCSVHandler = exportUsersCSVHandler;
exports.downloadCredentialsPdfHandler = downloadCredentialsPdfHandler;
const userService = __importStar(require("../services/userService"));
const ApiError_1 = require("../utils/ApiError");
const rbac_1 = require("../utils/rbac");
const allowedSortFields = new Set([
    "employeeId",
    "name",
    "email",
    "mobile",
    "role",
    "teamName",
    "designation",
    "createdAt",
    "status",
]);
function parseUserQuery(req) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const sortByRaw = req.query.sortBy || "createdAt";
    const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const scope = userService.resolveUserListScope(req.user);
    return {
        q: req.query.q,
        teamId: req.query.teamId,
        role: req.query.role,
        status: req.query.status,
        page,
        limit,
        sortBy,
        sortOrder: sortOrder,
        ...scope,
    };
}
async function resolveScopedTeamId(req) {
    return userService.resolveUserTeamScope(req.user);
}
async function createUserHandler(req, res) {
    if (!req.user || !(0, rbac_1.canCreateUsers)(req.user.role)) {
        throw new ApiError_1.ApiError(403, "You do not have permission to create users");
    }
    const result = await userService.createUser(req.body, req.user);
    res.status(201).json({
        message: "User created successfully",
        user: result.user,
    });
}
async function listUsers(req, res) {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    const options = parseUserQuery(req);
    if (req.user.role === "team_lead" && !options.scopedTeamId) {
        const scopedTeamId = await resolveScopedTeamId(req);
        if (scopedTeamId)
            options.scopedTeamId = scopedTeamId;
    }
    const result = await userService.getUsers(options);
    res.json({ ...result, page: options.page, limit: options.limit });
}
async function listAssignableUsers(req, res) {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    const users = await userService.getAssignableUsers(req.user);
    res.json({ items: users });
}
async function readUser(req, res) {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    const user = await userService.getUserById(String(req.params.id), req.user);
    res.json({ user });
}
async function updateUserHandler(req, res) {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    const isSelfUpdate = req.user.id === String(req.params.id);
    if (!isSelfUpdate && !(0, rbac_1.canManageUsers)(req.user.role)) {
        throw new ApiError_1.ApiError(403, "You do not have permission to edit users");
    }
    if (isSelfUpdate) {
        const { name, email, mobile } = req.body;
        const user = await userService.updateUserById(String(req.params.id), { name, email, mobile }, req.user);
        res.json({ message: "Profile updated successfully", user });
        return;
    }
    const user = await userService.updateUserById(String(req.params.id), req.body, req.user);
    res.json({ message: "User updated successfully", user });
}
async function deleteUserHandler(req, res) {
    if (!req.user || !(0, rbac_1.canDeleteUsers)(req.user.role)) {
        throw new ApiError_1.ApiError(403, "You do not have permission to delete users");
    }
    await userService.deleteUserById(String(req.params.id), req.user);
    res.json({ message: "User deleted successfully" });
}
async function resetPasswordHandler(req, res) {
    if (!req.user || !(0, rbac_1.canResetOthersPassword)(req.user.role)) {
        throw new ApiError_1.ApiError(403, "Only Admin or Super Admin can reset passwords");
    }
    const { userId, password } = req.body;
    const result = await userService.resetUserPassword(userId, password, req.user);
    res.json(result);
}
async function exportUsersCSVHandler(req, res) {
    if (!req.user || !(0, rbac_1.canManageUsers)(req.user.role)) {
        throw new ApiError_1.ApiError(403, "Forbidden");
    }
    const options = parseUserQuery(req);
    options.limit = 10000;
    options.page = 1;
    const csv = await userService.exportUsersCSV(options);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users-export.csv");
    res.status(200).send(csv);
}
async function downloadCredentialsPdfHandler(req, res) {
    const { name, employeeId, username, temporaryPassword } = req.body;
    if (!name || !employeeId || !username || !temporaryPassword) {
        throw new ApiError_1.ApiError(400, "All credential fields are required");
    }
    const pdfBytes = await userService.generateCredentialsPdf({
        name,
        employeeId,
        username,
        temporaryPassword,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${employeeId}-credentials.pdf`);
    res.status(200).send(Buffer.from(pdfBytes));
}
