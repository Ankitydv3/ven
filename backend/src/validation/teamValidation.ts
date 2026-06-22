import { z } from "zod";

export const teamSchema = z.object({
  teamName: z.string().min(2, "Team name is required").max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["active", "inactive"]).optional()
});

export const teamUpdateSchema = teamSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});
