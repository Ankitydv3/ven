"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    action: { type: String, required: true, index: true },
    changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    targetUser: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    targetUserName: { type: String },
    details: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("AuditLog", auditLogSchema);
