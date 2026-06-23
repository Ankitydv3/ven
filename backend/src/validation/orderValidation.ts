import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  phone: z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
  email: z.string().trim().email("Email must be valid"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().min(4, "Pincode is required"),
  materialType: z.enum(["Aluminium", "uPVC"]),
  deliveryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  serviceType: z.string().trim().optional().default("General"),
  status: z.string().trim().optional().default("Pending"),
  amount: z.number().optional().default(0),
  paid: z.boolean().optional().default(false),
  assignedTeam: z.string().optional().default(""),
  category: z.string().optional().default("General")
});

export const orderUpdateSchema = orderSchema.partial();

export const orderBulkImportSchema = z.object({
  orders: z.array(orderSchema).min(1, "At least one order is required").max(500, "Maximum 500 orders per import")
});
