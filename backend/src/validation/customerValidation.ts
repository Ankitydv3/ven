import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const customerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
  email: z.string().trim().email("Email must be valid"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().min(4, "Pincode is required"),
  alternatePhone: z.string().trim().regex(phoneRegex, "Alternate phone must be 10 digits").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal(""))
});

export const customerUpdateSchema = customerSchema.partial();