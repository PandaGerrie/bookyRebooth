import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  imageUrl: z.string().min(1).nullable().optional(),
  slug: slugSchema,
  entityId: z.string().cuid().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    imageUrl: z.string().min(1).nullable().optional(),
    slug: slugSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
