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
  status: z
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

export const taskStatusSchema = z.object({
  status: z.enum([
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
    "Overdue",
    "Need Re-visit",
    "Need Material",
  ]),
  notes: z.string().trim().optional(),
  photoUrl: z.string().trim().optional(),
  materialName: z.string().trim().optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().trim().optional(),
  revisitDate: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? parseDateKey(dateKeyFromValue(val)) : undefined)),
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

export const taskReopenSchema = z.object({
  status: z.literal("Pending"),
});
