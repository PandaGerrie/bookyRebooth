import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_DEMO: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SEED_DEMO_ENTITY_NAME: z.string().default("Demo Dealer"),
  SEED_DEMO_ENTITY_SLUG: z.string().default("demo-dealer"),
  SEED_DEMO_ADMIN_EMAIL: z.string().email().optional(),
  SEED_DEMO_ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
