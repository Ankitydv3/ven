import { z } from "zod";

export const materialRequestCreateSchema = z.object({
  materialName: z.string().trim().min(1, "Material name is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().trim().min(1, "Unit is required"),
  remarks: z.string().trim().optional().default(""),
  imageUrl: z.string().trim().optional().default(""),
  taskId: z.string().trim().optional(),
  complaintId: z.string().trim().optional(),
});

export const materialRequestStatusSchema = z.object({
  status: z.enum(["WAITING", "OUT_OF_STOCK", "GRANTED"]),
  storeManagerRemarks: z.string().trim().optional().default(""),
});
