import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { resolveEntityIdForWrite } from "../../lib/entityScope.js";
import {
  updateContentSettingsSchema,
  updateDomainSettingsSchema,
  updateTrackingSettingsSchema,
} from "./settings.schemas.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

const entitySettingsSelect = {
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
} as const;

settingsRouter.get("/domain", async (req, res, next) => {
  try {
    const queryEntityId =
      typeof req.query.entityId === "string" ? req.query.entityId : null;
    const scope = resolveEntityIdForWrite(req.user!, queryEntityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.findUnique({
      where: { id: scope.entityId },
      select: entitySettingsSelect,
    });

    if (!entity) {
      res.status(404).json({ error: "Entiteit niet gevonden" });
      return;
    }

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});

settingsRouter.patch("/domain", async (req, res, next) => {
  try {
    const body = updateDomainSettingsSchema.parse(req.body);
    const scope = resolveEntityIdForWrite(req.user!, body.entityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.update({
      where: { id: scope.entityId },
      data: { domain: body.domain ? body.domain : null },
      select: entitySettingsSelect,
    });

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});

settingsRouter.get("/content", async (req, res, next) => {
  try {
    const queryEntityId =
      typeof req.query.entityId === "string" ? req.query.entityId : null;
    const scope = resolveEntityIdForWrite(req.user!, queryEntityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.findUnique({
      where: { id: scope.entityId },
      select: entitySettingsSelect,
    });

    if (!entity) {
      res.status(404).json({ error: "Entiteit niet gevonden" });
      return;
    }

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});

settingsRouter.patch("/content", async (req, res, next) => {
  try {
    const body = updateContentSettingsSchema.parse(req.body);
    const scope = resolveEntityIdForWrite(req.user!, body.entityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.update({
      where: { id: scope.entityId },
      data: {
        logoUrl: body.logoUrl,
        introText: body.introText?.trim() ? body.introText.trim() : null,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
      },
      select: entitySettingsSelect,
    });

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});

settingsRouter.get("/tracking", async (req, res, next) => {
  try {
    const queryEntityId =
      typeof req.query.entityId === "string" ? req.query.entityId : null;
    const scope = resolveEntityIdForWrite(req.user!, queryEntityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.findUnique({
      where: { id: scope.entityId },
      select: {
        id: true,
        name: true,
        slug: true,
        gtmId: true,
        headerScripts: true,
        footerScripts: true,
      },
    });

    if (!entity) {
      res.status(404).json({ error: "Entiteit niet gevonden" });
      return;
    }

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});

settingsRouter.patch("/tracking", async (req, res, next) => {
  try {
    const body = updateTrackingSettingsSchema.parse(req.body);
    const scope = resolveEntityIdForWrite(req.user!, body.entityId);

    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const entity = await prisma.entity.update({
      where: { id: scope.entityId },
      data: {
        gtmId: body.gtmId,
        headerScripts: body.headerScripts?.trim()
          ? body.headerScripts
          : null,
        footerScripts: body.footerScripts?.trim()
          ? body.footerScripts
          : null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        gtmId: true,
        headerScripts: true,
        footerScripts: true,
      },
    });

    res.json({ entity });
  } catch (error) {
    next(error);
  }
});
