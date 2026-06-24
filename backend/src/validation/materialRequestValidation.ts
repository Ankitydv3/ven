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
  status: z.enum(["WAITING", "OUT_OF_STOCK", "GRANTED"]),
  storeManagerRemarks: z.string().trim().optional().default(""),
});

export const materialServiceHeadSchema = z.object({
  decision: z.enum(["APPROVED", "DENIED"]),
  serviceHeadRemarks: z.string().trim().optional().default(""),
});

export const materialPaymentConfirmSchema = z.object({
  confirmed: z.literal(true),
});
