"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRequired = authRequired;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiError_1 = require("../utils/ApiError");
function authRequired(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next(new ApiError_1.ApiError(401, "Authorization token missing"));
    }
    try {
        const token = authHeader.slice(7);
        req.user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? "dev-secret");
        next();
    }
    catch {
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
