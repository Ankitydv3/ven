"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const feedbackSchema = new mongoose_1.Schema({
    feedbackId: { type: String, required: true, unique: true, index: true },
    complaintId: { type: String, index: true },
    taskId: { type: String, index: true },
    team: { type: String, required: true, index: true },
    assignedUserId: { type: String, index: true },
    assignedUserName: { type: String, default: "", index: true },
    customerName: { type: String, required: true },
    sentiment: {
        type: String,
        enum: ["Positive", "Negative"],
        required: true,
        index: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: "" },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Feedback", feedbackSchema);
