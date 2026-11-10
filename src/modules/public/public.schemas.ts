import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum moet YYYY-MM-DD zijn");

export const publicAvailabilitySlotsSchema = z.object({
  location: z.string().min(1).max(120),
  category: z.string().min(1).max(120),
  date: dateSchema,
  dayStartHour: z.number().int().min(0).max(23).optional().default(10),
});
