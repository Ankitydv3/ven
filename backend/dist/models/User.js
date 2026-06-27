"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    employeeId: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, default: "", unique: true, sparse: true, index: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["super_admin", "admin", "sub_admin", "team", "customer", "manager", "team_lead", "accountant", "store_manager"],
        required: true
    },
    subAdminType: {
        type: String,
        enum: ["accountant", "plant_head"],
        required: false
    },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team", index: true },
    teamName: { type: String, index: true },
    team: { type: String },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdBy: { type: String, default: "System" },
    deletedAt: { type: Date, default: null, index: true }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("User", userSchema);
