import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const scheduleSchema = z.object({
  complaintId: z.string().trim().optional(),
  complaintTitle: z.string().trim().optional(),
  orderId: z.string().trim().optional(),
  customerName: z.string().trim().min(2, "Customer name is required"),
  serviceType: z.string().trim().min(2, "Service type is required"),
  team: z.string().trim().min(2, "Team is required"),
  scheduledDate: z.string().or(z.date()).transform((val) => new Date(val)),
  startTime: z.string().trim().regex(timeRegex, "Start time must be HH:mm (24h)"),
  endTime: z.string().trim().regex(timeRegex, "End time must be HH:mm (24h)"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  status: z
    .enum(["Scheduled", "Pending", "In Progress", "Completed", "Cancelled", "Overdue"])
    .optional()
    .default("Scheduled"),
  remarks: z.string().trim().optional().default("")
});

export const scheduleUpdateSchema = scheduleSchema.partial().extend({
  completedAt: z.string().or(z.date()).transform((val) => new Date(val)).optional()
});
