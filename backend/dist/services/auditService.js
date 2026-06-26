"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
async function logAuditEvent(payload) {
    await AuditLog_1.default.create({
        action: payload.action,
        changedBy: payload.changedBy,
        changedByName: payload.changedByName,
        targetUser: payload.targetUser,
        targetUserName: payload.targetUserName,
        details: payload.details,
    });
}
