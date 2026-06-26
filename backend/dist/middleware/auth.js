"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRequired = authRequired;
exports.requireRole = requireRole;
exports.requireAdminPortalRole = requireAdminPortalRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = require("../utils/ApiError");
const NOT_DELETED_FILTER = {
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};
async function hydrateUser(decoded) {
    const user = await User_1.default.findOne({
        $and: [{ _id: decoded.id }, NOT_DELETED_FILTER],
    });
    if (!user) {
        throw new ApiError_1.ApiError(401, "Invalid or expired token");
    }
    if (user.status === "disabled") {
        throw new ApiError_1.ApiError(403, "Account is disabled. Contact administrator.");
    }
    return {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team ?? user.teamName ?? undefined,
        teamId: user.teamId ? String(user.teamId) : undefined,
        teamName: user.teamName ?? user.team ?? undefined,
        employeeId: user.employeeId ?? undefined,
        subAdminType: user.subAdminType ?? undefined,
    };
}
async function authRequired(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next(new ApiError_1.ApiError(401, "Authorization token missing"));
    }
    try {
        const token = authHeader.slice(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? "dev-secret");
        req.user = await hydrateUser(decoded);
        next();
    }
    catch (err) {
        if (err instanceof ApiError_1.ApiError) {
            return next(err);
        }
        next(new ApiError_1.ApiError(401, "Invalid or expired token"));
    }
}
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new ApiError_1.ApiError(401, "Unauthorized"));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ApiError_1.ApiError(403, "Forbidden"));
        }
        next();
    };
}
const ADMIN_PORTAL_ROLES = ["super_admin", "admin", "sub_admin"];
function requireAdminPortalRole() {
    return requireRole(...ADMIN_PORTAL_ROLES);
}
