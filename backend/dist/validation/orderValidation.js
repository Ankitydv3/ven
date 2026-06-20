"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderUpdateSchema = exports.orderSchema = void 0;
const zod_1 = require("zod");
const phoneRegex = /^[0-9]{10}$/;
exports.orderSchema = zod_1.z.object({
    customerName: zod_1.z.string().trim().min(2, "Customer name is required"),
    phone: zod_1.z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
    email: zod_1.z.string().trim().email("Email must be valid"),
    address: zod_1.z.string().trim().min(3, "Address is required"),
    city: zod_1.z.string().trim().min(2, "City is required"),
    state: zod_1.z.string().trim().min(2, "State is required"),
    pincode: zod_1.z.string().trim().min(4, "Pincode is required"),
    materialType: zod_1.z.enum(["Aluminium", "uPVC"]),
    deliveryDate: zod_1.z.string().or(zod_1.z.date()).transform((val) => new Date(val)),
    serviceType: zod_1.z.string().trim().optional().default("General"),
    status: zod_1.z.string().trim().optional().default("Pending"),
    amount: zod_1.z.number().optional().default(0),
    paid: zod_1.z.boolean().optional().default(false),
    assignedTeam: zod_1.z.string().optional().default(""),
    category: zod_1.z.string().optional().default("General")
});
exports.orderUpdateSchema = exports.orderSchema.partial();
