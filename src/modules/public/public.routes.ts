import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { getAvailabilitySlots } from "../availability/availability.service.js";
import { publicAvailabilitySlotsSchema } from "./public.schemas.js";

export const publicRouter = Router();

/**
 * Publieke beschikbaarheid (geen CMS-login).
 * Scoped via entity slug in de URL.
 *
 * POST /api/public/:entitySlug/availability/slots
 */
publicRouter.post("/:entitySlug/availability/slots", async (req, res, next) => {
  try {
    const entitySlug = String(req.params.entitySlug).trim().toLowerCase();
    const body = publicAvailabilitySlotsSchema.parse(req.body);

    const entity = await prisma.entity.findUnique({
      where: { slug: entitySlug },
      select: { id: true, name: true, slug: true, active: true },
    });

    if (!entity || !entity.active) {
      res.status(404).json({ error: "Entiteit niet gevonden" });
      return;
    }

    const result = await getAvailabilitySlots({
      entityId: entity.id,
      location: body.location,
      category: body.category,
      date: body.date,
      dayStartHour: body.dayStartHour,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    // Publieke response: geen e-mail / interne Azure-details
    res.json({
      entity: {
        name: entity.name,
        slug: entity.slug,
      },
      date: result.data.date,
      weekday: result.data.weekday,
      dayStartHour: result.data.dayStartHour,
      location: result.data.location,
      category: result.data.category,
      sellers: result.data.sellers.map((seller) => ({
        sellerId: seller.sellerId,
        name: seller.name,
        imageUrl: seller.imageUrl,
        workSchedule: seller.workSchedule,
        slots: seller.slots,
        availableSlots: seller.availableSlots,
      })),
    });
  } catch (error) {
    next(error);
  }
});
