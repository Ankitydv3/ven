"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materialPaymentConfirmSchema = exports.materialServiceHeadSchema = exports.materialRequestStatusSchema = exports.materialRequestCreateSchema = void 0;
const zod_1 = require("zod");
exports.materialRequestCreateSchema = zod_1.z.object({
    materialName: zod_1.z.string().trim().min(1, "Material name is required"),
    quantity: zod_1.z.coerce.number().positive("Quantity must be greater than 0"),
    unit: zod_1.z.string().trim().optional().default(""),
    remarks: zod_1.z.string().trim().optional().default(""),
    imageUrl: zod_1.z.string().trim().min(1, "Photo is required"),
    taskId: zod_1.z.string().trim().optional(),
    complaintId: zod_1.z.string().trim().optional(),
});
exports.materialRequestStatusSchema = zod_1.z.object({
    decision: zod_1.z.enum(["WAIT", "DECLINE", "GRANT"]),
    availability: zod_1.z.enum(["AVAILABLE", "OUT_OF_STOCK"]),
    storeManagerRemarks: zod_1.z.string().trim().optional().default(""),
    revisitDate: zod_1.z.string().trim().optional(),
    revisitTimeSlot: zod_1.z.string().trim().optional(),
});
exports.materialServiceHeadSchema = zod_1.z.object({
    decision: zod_1.z.enum(["APPROVED", "DENIED"]),
    serviceHeadRemarks: zod_1.z.string().trim().optional().default(""),
    revisitDate: zod_1.z.string().trim().optional(),
    revisitTimeSlot: zod_1.z.string().trim().optional(),
    stockDecision: zod_1.z.enum(["STOCK_AVAILABLE", "OUT_OF_STOCK"]).optional(),
});
exports.materialPaymentConfirmSchema = zod_1.z.object({
    confirmed: zod_1.z.literal(true),
    paymentMode: zod_1.z.enum(["received", "onsite"]),
});
