import { z } from "zod";

const freeChoiceOptionSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  imageUrl: z.string().min(1).nullable().optional(),
});

const freeChoiceConfigSchema = z.object({
  options: z.array(freeChoiceOptionSchema).min(1),
});

const productSetConfigSchema = z.object({
  productSetId: z.string().cuid(),
});

const locationsConfigSchema = z.object({
  locationIds: z.array(z.string().cuid()).min(1),
  showImage: z.boolean().optional().default(true),
});

const sellersAgendaConfigSchema = z.object({}).strict();

const stepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FREE_CHOICE"),
    config: freeChoiceConfigSchema,
  }),
  z.object({
    type: z.literal("PRODUCT_SET"),
    config: productSetConfigSchema,
  }),
  z.object({
    type: z.literal("LOCATIONS"),
    config: locationsConfigSchema,
  }),
  z.object({
    type: z.literal("SELLERS_AGENDA"),
    config: sellersAgendaConfigSchema,
  }),
]);

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const createFlowSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema.optional(),
  featuredImage: z.string().min(1).nullable().optional(),
  active: z.boolean().optional().default(true),
  entityId: z.string().cuid().optional(),
  steps: z.array(stepSchema).default([]),
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  featuredImage: z.string().min(1).nullable().optional(),
  active: z.boolean(),
  steps: z.array(stepSchema),
});

export const patchFlowActiveSchema = z.object({
  active: z.boolean(),
});
