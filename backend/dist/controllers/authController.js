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
exports.login = login;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const ApiError_1 = require("../utils/ApiError");
const userService = __importStar(require("../services/userService"));
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError_1.ApiError(400, "Email and password are required");
    }
    const user = await User_1.default.findOne({
        $and: [
            { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
            { $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }] },
        ],
    });
    if (!user) {
        throw new ApiError_1.ApiError(401, "Invalid credentials");
    }
    if (user.status === "disabled") {
        throw new ApiError_1.ApiError(403, "Account is disabled. Contact administrator.");
    }
    const validPassword = await bcryptjs_1.default.compare(password, user.password);
    if (!validPassword) {
        throw new ApiError_1.ApiError(401, "Invalid credentials");
    }
    const token = (0, jwt_1.signToken)({
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team ?? user.teamName ?? undefined,
        teamId: user.teamId ? String(user.teamId) : undefined,
        teamName: user.teamName ?? undefined,
        employeeId: user.employeeId ?? undefined,
        subAdminType: user.subAdminType ?? undefined,
    });
    res.json({
        token,
        user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            mobile: user.mobile ?? undefined,
            role: user.role,
            team: user.team ?? user.teamName ?? undefined,
            teamId: user.teamId ? String(user.teamId) : undefined,
            teamName: user.teamName ?? undefined,
            employeeId: user.employeeId ?? undefined,
            designation: user.designation ?? undefined,
            department: user.department ?? undefined,
            subAdminType: user.subAdminType ?? undefined,
        },
    });
}
async function changePassword(req, res) {
    if (!req.user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    const { newPassword } = req.body;
    const result = await userService.changeOwnPassword(req.user.id, newPassword);
    res.json(result);
}
