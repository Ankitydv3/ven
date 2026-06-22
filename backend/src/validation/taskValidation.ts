import { z } from "zod";
import { dateKeyFromValue, parseDateKey } from "../utils/dateKey";

export const taskCreateSchema = z.object({
  complaintId: z.string().trim().optional(),
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().trim().optional().default(""),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  assignedUserId: z.string().trim().min(1, "Assignee is required"),
  dueDate: z
    .string()
    .or(z.date())
    .transform((val) => parseDateKey(dateKeyFromValue(val))),
  remarks: z.string().trim().optional().default(""),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled", "Overdue"]).optional(),
});

export const taskStatusSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled", "Overdue"]),
});

export const taskReopenSchema = z.object({
  status: z.literal("Pending"),
});
