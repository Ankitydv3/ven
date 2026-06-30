"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.profileSelfUpdateSchema = exports.userUpdateSchema = exports.userCreateSchema = void 0;
const zod_1 = require("zod");
const createRoles = ["admin", "sub_admin", "team"];
const allRoles = ["super_admin", "admin", "sub_admin", "team", "manager", "team_lead", "accountant", "customer", "store_manager"];
const passwordField = zod_1.z.string().min(8, "Password must be at least 8 characters");
const subAdminTypeField = zod_1.z.enum(["accountant", "plant_head"]).optional();
exports.userCreateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(2, "Full name is required").max(120),
    email: zod_1.z.string().email("Valid email is required"),
    mobile: zod_1.z.string().min(10, "Valid phone number is required").max(15),
    password: passwordField,
    confirmPassword: zod_1.z.string().min(1, "Confirm password is required"),
    role: zod_1.z.enum(createRoles),
    teamName: zod_1.z.string().trim().min(1).optional(),
    subAdminType: subAdminTypeField,
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})
    .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
});
exports.userUpdateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(2).max(120).optional(),
    email: zod_1.z.string().email().optional(),
    mobile: zod_1.z.string().min(10).max(15).optional(),
    role: zod_1.z.enum(allRoles).optional(),
    status: zod_1.z.enum(["active", "disabled"]).optional(),
    teamName: zod_1.z.string().trim().min(1).optional(),
    subAdminType: subAdminTypeField,
    designation: zod_1.z.string().trim().max(120).optional(),
    department: zod_1.z.string().trim().max(120).optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
})
    .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
});
exports.profileSelfUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Full name is required").max(120),
    email: zod_1.z.string().email("Valid email is required"),
    mobile: zod_1.z.string().min(10, "Valid phone number is required").max(15),
});
exports.resetPasswordSchema = zod_1.z
    .object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    password: passwordField,
    confirmPassword: zod_1.z.string().min(1, "Confirm password is required"),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
exports.changePasswordSchema = zod_1.z
    .object({
    newPassword: passwordField,
    confirmPassword: zod_1.z.string().min(1, "Confirm password is required"),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
