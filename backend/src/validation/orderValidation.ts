import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

const complaintIssueTypes = [
  "Locking issue",
  "Leakage issue",
  "Difficulty in moving",
  "Alignment issue",
  "Other",
] as const;

const orderBaseSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  phone: z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
  email: z.string().trim().email("Email must be valid"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().min(4, "Pincode is required"),
  materialType: z.enum(["Aluminium", "uPVC"]),
  deliveryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  complaintType: z.enum(complaintIssueTypes).optional(),
  complaintDescription: z.string().trim().optional().default(""),
  serviceType: z.string().trim().optional().default("General"),
  status: z.string().trim().optional().default("Pending"),
  amount: z.number().optional().default(0),
  paid: z.boolean().optional().default(false),
  assignedTeam: z.string().optional().default(""),
  category: z.string().optional().default("General"),
});

function refineComplaintDescription(
  data: { complaintType?: string; complaintDescription?: string },
  ctx: z.RefinementCtx
) {
  if (data.complaintType === "Other" && (data.complaintDescription ?? "").trim().length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a description for other complaint types",
      path: ["complaintDescription"],
    });
  }
}

export const orderSchema = orderBaseSchema.superRefine(refineComplaintDescription);

export const orderUpdateSchema = orderBaseSchema.partial().superRefine(refineComplaintDescription);

export const orderBulkImportSchema = z.object({
  orders: z.array(orderSchema).min(1, "At least one order is required").max(500, "Maximum 500 orders per import"),
});
