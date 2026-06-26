"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const taskAlertSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["task_assigned", "task_reassigned", "task_completed", "task_overdue", "task_cancelled"],
        required: true,
        index: true,
    },
    taskId: { type: String, required: true, index: true },
    taskObjectId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Task" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    teamName: { type: String, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
    priority: { type: String, default: "Medium" },
    read: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("TaskAlert", taskAlertSchema);
