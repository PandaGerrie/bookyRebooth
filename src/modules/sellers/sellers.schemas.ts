import { z } from "zod";

const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

const scheduleItemSchema = z.object({
  weekday: weekdaySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  locationId: z.string().cuid(),
});

function uniqueWeekdays(
  schedules: Array<{ weekday: string }>,
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>();
  for (const [index, item] of schedules.entries()) {
    if (seen.has(item.weekday)) {
      ctx.addIssue({
        code: "custom",
        path: ["schedules", index, "weekday"],
        message: "Elke weekdag mag maar één keer voorkomen",
      });
    }
    seen.add(item.weekday);
  }
}

function validTimeRanges(
  schedules: Array<{ startTime: string; endTime: string }>,
  ctx: z.RefinementCtx,
) {
  for (const [index, item] of schedules.entries()) {
    if (item.startTime >= item.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["schedules", index, "endTime"],
        message: "Eindtijd moet na starttijd liggen",
      });
    }
  }
}

export const createSellerSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    imageUrl: z.string().min(1),
    active: z.boolean().optional().default(true),
    entityId: z.string().cuid().optional(),
    categoryIds: z.array(z.string().cuid()).default([]),
    schedules: z.array(scheduleItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    uniqueWeekdays(data.schedules, ctx);
    validTimeRanges(data.schedules, ctx);
  });

export const updateSellerSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    imageUrl: z.string().min(1),
    active: z.boolean(),
    categoryIds: z.array(z.string().cuid()).default([]),
    schedules: z.array(scheduleItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    uniqueWeekdays(data.schedules, ctx);
    validTimeRanges(data.schedules, ctx);
  });
