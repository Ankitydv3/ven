"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskReopenSchema = exports.taskStatusSchema = exports.taskUpdateSchema = exports.taskCreateSchema = void 0;
const zod_1 = require("zod");
const dateKey_1 = require("../utils/dateKey");
exports.taskCreateSchema = zod_1.z.object({
    complaintId: zod_1.z.string().trim().optional(),
    title: zod_1.z.string().trim().min(2, "Title is required"),
    description: zod_1.z.string().trim().optional().default(""),
    priority: zod_1.z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    assignedUserId: zod_1.z.string().trim().min(1, "Assignee is required"),
    dueDate: zod_1.z
        .string()
        .or(zod_1.z.date())
        .transform((val) => (0, dateKey_1.parseDateKey)((0, dateKey_1.dateKeyFromValue)(val))),
    remarks: zod_1.z.string().trim().optional().default(""),
});
exports.taskUpdateSchema = exports.taskCreateSchema.partial().extend({
    status: zod_1.z
        .enum([
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
        "Overdue",
        "Need Re-visit",
        "Need Material",
    ])
        .optional(),
});
exports.taskStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
        "Overdue",
        "Need Re-visit",
        "Need Material",
    ]),
    notes: zod_1.z.string().trim().optional(),
    photoUrl: zod_1.z.string().trim().optional(),
    materialName: zod_1.z.string().trim().optional(),
    quantity: zod_1.z.coerce.number().positive().optional(),
    unit: zod_1.z.string().trim().optional(),
    revisitDate: zod_1.z
        .string()
        .trim()
        .optional()
        .transform((val) => (val ? (0, dateKey_1.parseDateKey)((0, dateKey_1.dateKeyFromValue)(val)) : undefined)),
}).superRefine((data, ctx) => {
    if (data.status === "Need Material") {
        if (!data.materialName?.trim()) {
            ctx.addIssue({ code: "custom", message: "Material name is required", path: ["materialName"] });
        }
        if (!data.quantity || data.quantity <= 0) {
            ctx.addIssue({ code: "custom", message: "Quantity is required", path: ["quantity"] });
        }
        if (!data.photoUrl?.trim()) {
            ctx.addIssue({ code: "custom", message: "Photo is required", path: ["photoUrl"] });
        }
    }
    if (data.status === "Need Re-visit" && !data.revisitDate) {
        ctx.addIssue({ code: "custom", message: "Re-visit date is required", path: ["revisitDate"] });
    }
});
exports.taskReopenSchema = zod_1.z.object({
    status: zod_1.z.literal("Pending"),
});
