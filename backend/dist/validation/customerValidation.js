"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerUpdateSchema = exports.customerSchema = void 0;
const zod_1 = require("zod");
const phoneRegex = /^[0-9]{10}$/;
exports.customerSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, "Full name is required"),
    phone: zod_1.z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
    email: zod_1.z.string().trim().email("Email must be valid"),
    address: zod_1.z.string().trim().min(3, "Address is required"),
    city: zod_1.z.string().trim().min(2, "City is required"),
    state: zod_1.z.string().trim().min(2, "State is required"),
    pincode: zod_1.z.string().trim().min(4, "Pincode is required"),
    alternatePhone: zod_1.z.string().trim().regex(phoneRegex, "Alternate phone must be 10 digits").optional().or(zod_1.z.literal("")),
    notes: zod_1.z.string().trim().optional().or(zod_1.z.literal(""))
});
exports.customerUpdateSchema = exports.customerSchema.partial();
