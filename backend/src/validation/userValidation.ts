import { z } from "zod";

const createRoles = ["admin", "sub_admin", "team"] as const;
const allRoles = ["super_admin", "admin", "sub_admin", "team", "manager", "team_lead", "accountant", "customer"] as const;

const passwordField = z.string().min(8, "Password must be at least 8 characters");

const subAdminTypeField = z.enum(["accountant", "plant_head"]).optional();

export const userCreateSchema = z
  .object({
    name: z.string().min(2, "Full name is required").max(120),
    email: z.string().email("Valid email is required"),
    mobile: z.string().min(10, "Valid phone number is required").max(15),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm password is required"),
    role: z.enum(createRoles),
    teamName: z.string().trim().min(1).optional(),
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

export const userUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    mobile: z.string().min(10).max(15).optional(),
    role: z.enum(allRoles).optional(),
    status: z.enum(["active", "disabled"]).optional(),
    teamName: z.string().trim().min(1).optional(),
    subAdminType: subAdminTypeField,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
  });

export const resetPasswordSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
