import { z } from "zod";

const productItemSchema = z.object({
  name: z.string().min(1).max(120),
  photoUrl: z.string().min(1),
});

export const createProductSetSchema = z.object({
  name: z.string().min(1).max(120),
  products: z.array(productItemSchema).default([]),
  entityIds: z.array(z.string().cuid()).default([]),
});

export const updateProductSetSchema = z.object({
  name: z.string().min(1).max(120),
  products: z.array(productItemSchema).default([]),
  entityIds: z.array(z.string().cuid()).default([]),
});
