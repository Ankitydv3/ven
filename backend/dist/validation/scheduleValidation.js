"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleUpdateSchema = exports.scheduleSchema = void 0;
const zod_1 = require("zod");
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
exports.scheduleSchema = zod_1.z.object({
    complaintId: zod_1.z.string().trim().optional(),
    complaintTitle: zod_1.z.string().trim().optional(),
    orderId: zod_1.z.string().trim().optional(),
    customerName: zod_1.z.string().trim().min(2, "Customer name is required"),
    serviceType: zod_1.z.string().trim().min(2, "Service type is required"),
    team: zod_1.z.string().trim().min(2, "Team is required"),
    scheduledDate: zod_1.z.string().or(zod_1.z.date()).transform((val) => new Date(val)),
    startTime: zod_1.z.string().trim().regex(timeRegex, "Start time must be HH:mm (24h)"),
    endTime: zod_1.z.string().trim().regex(timeRegex, "End time must be HH:mm (24h)"),
    priority: zod_1.z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    status: zod_1.z
        .enum(["Scheduled", "Pending", "In Progress", "Completed", "Cancelled", "Overdue"])
        .optional()
        .default("Scheduled"),
    remarks: zod_1.z.string().trim().optional().default("")
});
exports.scheduleUpdateSchema = exports.scheduleSchema.partial().extend({
    completedAt: zod_1.z.string().or(zod_1.z.date()).transform((val) => new Date(val)).optional()
});
