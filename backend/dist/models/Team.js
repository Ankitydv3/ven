"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const teamSchema = new mongoose_1.Schema({
    teamName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    description: { type: String, default: "" },
    status: {
        type: String,
        enum: ["active", "disabled"],
        default: "active",
        index: true,
    },
    createdBy: { type: String, default: "System" },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Team", teamSchema);
