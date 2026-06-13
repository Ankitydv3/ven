"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function signToken(user) {
    return jsonwebtoken_1.default.sign(user, process.env.JWT_SECRET ?? "dev-secret", { expiresIn: "7d" });
}
