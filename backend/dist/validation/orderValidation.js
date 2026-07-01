"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderBulkImportSchema = exports.orderUpdateSchema = exports.orderSchema = void 0;
const zod_1 = require("zod");
const phoneRegex = /^[0-9]{10}$/;
const complaintIssueTypes = [
    "Locking issue",
    "Leakage issue",
    "Difficulty in moving",
    "Alignment issue",
    "Other",
];
const orderBaseSchema = zod_1.z.object({
    customerName: zod_1.z.string().trim().min(2, "Customer name is required"),
    phone: zod_1.z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
    email: zod_1.z.string().trim().email("Email must be valid"),
    address: zod_1.z.string().trim().min(3, "Address is required"),
    city: zod_1.z.string().trim().min(2, "City is required"),
    state: zod_1.z.string().trim().min(2, "State is required"),
    pincode: zod_1.z.string().trim().min(4, "Pincode is required"),
    materialType: zod_1.z.enum(["Aluminium", "uPVC"]),
    salesPerson: zod_1.z.string().trim().optional().default(""),
    deliveryDate: zod_1.z.string().or(zod_1.z.date()).transform((val) => new Date(val)),
    complaintType: zod_1.z.enum(complaintIssueTypes).optional(),
    complaintDescription: zod_1.z.string().trim().optional().default(""),
    serviceType: zod_1.z.string().trim().optional().default("General"),
    status: zod_1.z.string().trim().optional().default("Pending"),
    amount: zod_1.z.number().optional().default(0),
    paid: zod_1.z.boolean().optional().default(false),
    assignedTeam: zod_1.z.string().optional().default(""),
    category: zod_1.z.string().optional().default("General"),
});
function refineComplaintDescription(data, ctx) {
    if (data.complaintType === "Other" && (data.complaintDescription ?? "").trim().length < 10) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Please provide a description for other complaint types",
            path: ["complaintDescription"],
        });
    }
}
exports.orderSchema = orderBaseSchema.superRefine(refineComplaintDescription);
exports.orderUpdateSchema = orderBaseSchema.partial().superRefine(refineComplaintDescription);
exports.orderBulkImportSchema = zod_1.z.object({
    orders: zod_1.z.array(exports.orderSchema).min(1, "At least one order is required").max(500, "Maximum 500 orders per import"),
});
