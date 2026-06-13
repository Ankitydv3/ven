"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const ApiError_1 = require("../utils/ApiError");
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError_1.ApiError(400, "Email and password are required");
    }
    const user = await User_1.default.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw new ApiError_1.ApiError(401, "Invalid credentials");
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
        team: user.team ?? undefined
    });
    res.json({
        token,
        user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.team ?? undefined
        }
    });
}
