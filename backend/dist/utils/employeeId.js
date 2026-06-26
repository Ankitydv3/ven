"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmployeeId = generateEmployeeId;
exports.generateUsername = generateUsername;
exports.generateTemporaryPassword = generateTemporaryPassword;
exports.teamNameToSlug = teamNameToSlug;
const Counter_1 = __importDefault(require("../models/Counter"));
const crypto_1 = __importDefault(require("crypto"));
async function generateEmployeeId() {
    const counter = await Counter_1.default.findOneAndUpdate({ key: "employee" }, { $inc: { value: 1 }, $setOnInsert: { key: "employee" } }, { new: true, upsert: true });
    return `EMP${String(counter.value).padStart(4, "0")}`;
}
function generateUsername(teamSlug, employeeId) {
    const slug = teamSlug.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
    return `${slug}.${employeeId.toLowerCase()}`;
}
function generateTemporaryPassword(length = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
    let password = "";
    const bytes = crypto_1.default.randomBytes(length);
    for (let i = 0; i < length; i += 1) {
        password += chars[bytes[i] % chars.length];
    }
    return password;
}
function teamNameToSlug(teamName) {
    return teamName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "team";
}
