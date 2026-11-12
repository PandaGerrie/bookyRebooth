import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { assertHostAllowed } from "../../lib/domain.js";
import { uniqueSlug } from "../../lib/slugify.js";
import { getAvailabilitySlots } from "../availability/availability.service.js";
import { createBooking } from "../bookings/bookings.service.js";
import {
  publicAvailabilitySlotsSchema,
  publicCreateBookingSchema,
} from "./public.schemas.js";

export const publicRouter = Router();

type PublicOption = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  address?: string | null;
};

function resolveStepTitle(configRaw: unknown) {
  const config = asRecord(configRaw);
  return typeof config.title === "string" && config.title.trim()
    ? config.title.trim()
    : null;
}

function resolveImageFit(configRaw: unknown): "contain" | "cover" {
  const config = asRecord(configRaw);
  return config.imageFit === "cover" ? "cover" : "contain";
}

function hostFromRequest(req: {
  query: Record<string, unknown>;
  get: (name: string) => string | undefined;
}) {
  if (typeof req.query.host === "string" && req.query.host.trim()) {
    return req.query.host;
  }
  const origin = req.get("origin");
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      return origin;
    }
  }
  return req.get("x-forwarded-host") || req.get("host") || null;
}

type PublicEntityScope =
  | {
      entity: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        active: boolean;
      };
    }
  | { error: string; status: 403 | 404 };

async function resolvePublicEntity(
  entitySlug: string,
  host: string | null,
): Promise<PublicEntityScope> {
  const entity = await prisma.entity.findUnique({
    where: { slug: entitySlug },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      active: true,
    },
  });

  if (!entity || !entity.active) {
    return { error: "Entiteit niet gevonden", status: 404 };
  }

  const domainError = assertHostAllowed(entity.domain, host);
  if (domainError) {
    return { error: domainError, status: 403 };
  }

  return { entity };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function resolveStepOptions(
  type: string,
  configRaw: unknown,
  entityId: string,
): Promise<PublicOption[]> {
  const config = asRecord(configRaw);

  if (type === "FREE_CHOICE") {
    const options = Array.isArray(config.options) ? config.options : [];
    return options.flatMap((option, index) => {
      if (!option || typeof option !== "object") return [];
      const row = option as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name : "";
      const slug = typeof row.slug === "string" ? row.slug : "";
      if (!name || !slug) return [];
      return [
        {
          id: `free-${index}-${slug}`,
          name,
          slug,
          imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
        },
      ];
    });
  }

  if (type === "CATEGORIES") {
    const categoryIds = Array.isArray(config.categoryIds)
      ? config.categoryIds.map(String)
      : [];
    if (categoryIds.length === 0) return [];
    const categories = await prisma.category.findMany({
      where: { entityId, id: { in: categoryIds } },
      select: { id: true, name: true, slug: true, imageUrl: true },
    });
    const byId = new Map(categories.map((item) => [item.id, item]));
    const showImage = config.showImage !== false;
    return categoryIds.flatMap((id) => {
      const category = byId.get(id);
      if (!category) return [];
      return [
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
          imageUrl: showImage ? category.imageUrl : null,
        },
      ];
    });
  }

  if (type === "LOCATIONS") {
    const locationIds = Array.isArray(config.locationIds)
      ? config.locationIds.map(String)
      : [];
    if (locationIds.length === 0) return [];
    const locations = await prisma.location.findMany({
      where: { entityId, id: { in: locationIds } },
      select: {
        id: true,
        name: true,
        permalink: true,
        imageUrl: true,
        address: true,
      },
    });
    const byId = new Map(locations.map((item) => [item.id, item]));
    const showImage = config.showImage !== false;
    return locationIds.flatMap((id) => {
      const location = byId.get(id);
      if (!location) return [];
      return [
        {
          id: location.id,
          name: location.name,
          slug: location.permalink,
          imageUrl: showImage ? location.imageUrl : null,
          address: location.address,
        },
      ];
    });
  }

  if (type === "PRODUCT_SET") {
    const productSetId =
      typeof config.productSetId === "string" ? config.productSetId : null;
    if (!productSetId) return [];
    const productSet = await prisma.productSet.findFirst({
      where: {
        id: productSetId,
        entities: { some: { id: entityId } },
      },
      select: {
        products: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, photoUrl: true },
        },
      },
    });
    if (!productSet) return [];
    const used = new Set<string>(["no-product"]);
    const products = productSet.products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: uniqueSlug(product.name, used),
      imageUrl: product.photoUrl,
    }));

    if (config.allowNoProduct === true) {
      const noProductTitle =
        typeof config.noProductTitle === "string" &&
        config.noProductTitle.trim()
          ? config.noProductTitle.trim()
          : "Geen keuze";
      const noProductImageUrl =
        typeof config.noProductImageUrl === "string"
          ? config.noProductImageUrl
          : null;
      return [
        {
          id: "no-product",
          name: noProductTitle,
          slug: "no-product",
          imageUrl: noProductImageUrl,
        },
        ...products,
      ];
    }

    return products;
  }

  return [];
}

/**
 * Bootstrap voor de booking tool:
 * controleert entiteit + domein en geeft actieve flows terug.
 *
 * GET /api/public/:entitySlug/bootstrap?host=booking.example.com
 */
publicRouter.get("/:entitySlug/bootstrap", async (req, res, next) => {
  try {
    const entitySlug = String(req.params.entitySlug).trim().toLowerCase();
    const host = hostFromRequest(req);

    const entity = await prisma.entity.findUnique({
      where: { slug: entitySlug },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        logoUrl: true,
        introText: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        gtmId: true,
        headerScripts: true,
        footerScripts: true,
        active: true,
      },
    });

    if (!entity || !entity.active) {
      res.status(404).json({ error: "Entiteit niet gevonden" });
      return;
    }

    const domainError = assertHostAllowed(entity.domain, host);
    if (domainError) {
      res.status(403).json({ error: domainError });
      return;
    }

    const flows = await prisma.flow.findMany({
      where: {
        entityId: entity.id,
        active: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        featuredImage: true,
      },
    });

    res.json({
      entity: {
        name: entity.name,
        slug: entity.slug,
        domain: entity.domain,
        logoUrl: entity.logoUrl,
        introText: entity.introText,
        primaryColor: entity.primaryColor,
        secondaryColor: entity.secondaryColor,
        accentColor: entity.accentColor,
        gtmId: entity.gtmId,
        headerScripts: entity.headerScripts,
        footerScripts: entity.footerScripts,
      },
      flows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Publieke flow + opgeloste keuzes per stap.
 *
 * GET /api/public/:entitySlug/flows/:flowSlug?host=...
 */
publicRouter.get("/:entitySlug/flows/:flowSlug", async (req, res, next) => {
  try {
    const entitySlug = String(req.params.entitySlug).trim().toLowerCase();
    const flowSlug = String(req.params.flowSlug).trim().toLowerCase();
    const scope = await resolvePublicEntity(entitySlug, hostFromRequest(req));

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const flow = await prisma.flow.findFirst({
      where: {
        entityId: scope.entity.id,
        slug: flowSlug,
        active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        featuredImage: true,
        steps: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            sortOrder: true,
            config: true,
          },
        },
      },
    });

    if (!flow) {
      res.status(404).json({ error: "Flow niet gevonden" });
      return;
    }

    const steps = [];
    for (const step of flow.steps) {
      if (step.type === "CONFIRMATION") continue;
      const options = await resolveStepOptions(
        step.type,
        step.config,
        scope.entity.id,
      );
      steps.push({
        id: step.id,
        type: step.type,
        sortOrder: step.sortOrder,
        title:
          step.type === "CATEGORIES" ||
          step.type === "LOCATIONS" ||
          step.type === "PRODUCT_SET"
            ? resolveStepTitle(step.config)
            : null,
        imageFit:
          step.type === "CATEGORIES" || step.type === "LOCATIONS"
            ? resolveImageFit(step.config)
            : "contain",
        options,
      });
    }

    const confirmation = flow.steps.find((step) => step.type === "CONFIRMATION");
    steps.push({
      id: confirmation?.id ?? "confirmation",
      type: "CONFIRMATION",
      sortOrder: steps.length,
      title:
        (confirmation ? resolveStepTitle(confirmation.config) : null) ||
        "Persoonlijke gegevens",
      imageFit: "contain" as const,
      options: [],
    });

    res.json({
      flow: {
        id: flow.id,
        name: flow.name,
        slug: flow.slug,
        featuredImage: flow.featuredImage,
      },
      steps,
    });
  } catch (error) {
    next(error);
  }
});

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
    const scope = await resolvePublicEntity(entitySlug, hostFromRequest(req));

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = scope.entity;

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

/**
 * Publieke booking: blokkeert tijdslot in agenda van de verkoper.
 *
 * POST /api/public/:entitySlug/bookings
 */
publicRouter.post("/:entitySlug/bookings", async (req, res, next) => {
  try {
    const entitySlug = String(req.params.entitySlug).trim().toLowerCase();
    const body = publicCreateBookingSchema.parse(req.body);
    const scope = await resolvePublicEntity(entitySlug, hostFromRequest(req));

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const forwardedProto = req.get("x-forwarded-proto");
    const protocol =
      forwardedProto?.split(",")[0]?.trim() ||
      (req.protocol === "https" ? "https" : "http");
    const host = hostFromRequest(req);
    const publicBaseUrl = host ? `${protocol}://${host}` : "";

    const result = await createBooking({
      entityId: scope.entity.id,
      entityName: scope.entity.name,
      location: body.location,
      category: body.category,
      date: body.date,
      start: body.start,
      end: body.end,
      sellerId: body.sellerId,
      productName: body.productName,
      customer: body.customer,
      publicBaseUrl,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(201).json({
      booking: result.data,
    });
  } catch (error) {
    next(error);
  }
});
