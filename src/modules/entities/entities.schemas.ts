import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const createEntitySchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  active: z.boolean().optional().default(true),
});

export const updateEntitySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
