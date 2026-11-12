import { z } from "zod";
import { strongPasswordSchema } from "../../lib/password.js";

export const createUserSchema = z
  .object({
    email: z.string().email(),
    password: strongPasswordSchema,
    role: z.enum(["SUPER_ADMIN", "ENTITY_ADMIN"]).optional(),
    entityId: z.string().cuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Role/entity rules are enforced in the route based on who is logged in.
    if (data.role === "SUPER_ADMIN" && data.entityId) {
      ctx.addIssue({
        code: "custom",
        path: ["entityId"],
        message: "SUPER_ADMIN must not have an entityId",
      });
    }

    if (data.role === "ENTITY_ADMIN" && data.entityId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["entityId"],
        message: "ENTITY_ADMIN requires an entityId",
      });
    }
  });
