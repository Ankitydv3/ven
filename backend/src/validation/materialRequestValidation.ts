import { z } from "zod";

export const materialRequestCreateSchema = z.object({
  materialName: z.string().trim().min(1, "Material name is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().trim().optional().default(""),
  remarks: z.string().trim().optional().default(""),
  imageUrl: z.string().trim().min(1, "Photo is required"),
  taskId: z.string().trim().optional(),
  complaintId: z.string().trim().optional(),
});

export const materialRequestStatusSchema = z.object({
  decision: z.enum(["WAIT", "DECLINE", "GRANT"]),
  availability: z.enum(["AVAILABLE", "OUT_OF_STOCK"]),
  storeManagerRemarks: z.string().trim().optional().default(""),
  revisitDate: z.string().trim().optional(),
  revisitTimeSlot: z.string().trim().optional(),
});

export const materialServiceHeadSchema = z.object({
  decision: z.enum(["APPROVED", "DENIED", "COMPLETED"]),
  serviceHeadRemarks: z.string().trim().optional().default(""),
  revisitDate: z.string().trim().optional(),
  revisitTimeSlot: z.string().trim().optional(),
  stockDecision: z.enum(["STOCK_AVAILABLE", "OUT_OF_STOCK"]).optional(),
});

export const materialPaymentConfirmSchema = z.object({
  confirmed: z.literal(true),
  paymentMode: z.enum(["received", "onsite"]),
  remarks: z.string().trim().optional().default(""),
  materialUnitPrice: z.coerce.number().min(0, "Material amount cannot be negative").optional(),
});

export const materialOnsitePaymentCompleteSchema = z.object({
  confirmed: z.literal(true),
  remarks: z.string().trim().optional().default(""),
});
