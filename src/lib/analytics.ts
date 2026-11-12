import type { AnalyticsEventType } from "@prisma/client";
import { prisma } from "./prisma.js";

export type TrackEventInput = {
  type: AnalyticsEventType;
  entityId?: string | null;
  sellerId?: string | null;
  locationId?: string | null;
  categoryId?: string | null;
  message?: string | null;
};

function truncateMessage(message: string | null | undefined) {
  if (!message?.trim()) return null;
  return message.trim().slice(0, 500);
}

/** Fire-and-forget analytics write; never throws to callers. */
export function trackEvent(input: TrackEventInput) {
  void prisma.analyticsEvent
    .create({
      data: {
        type: input.type,
        entityId: input.entityId || null,
        sellerId: input.sellerId || null,
        locationId: input.locationId || null,
        categoryId: input.categoryId || null,
        message: truncateMessage(input.message),
      },
    })
    .catch((error) => {
      console.error("[analytics] trackEvent failed:", error);
    });
}
