import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { resolveEntityFilter } from "../../lib/entityScope.js";
import { getStatsOverview } from "./stats.service.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

/**
 * GET /api/stats/overview?days=30&entityId=
 * Entity admins are forced to their own entity; super admins may filter.
 */
statsRouter.get("/overview", async (req, res, next) => {
  try {
    const daysRaw = typeof req.query.days === "string" ? req.query.days : "30";
    const days = Number.parseInt(daysRaw, 10);
    const queryEntityId =
      typeof req.query.entityId === "string" && req.query.entityId.trim()
        ? req.query.entityId.trim()
        : null;

    const scope = resolveEntityFilter(req.user!, queryEntityId);
    if ("error" in scope) {
      res.status(scope.status).json({ error: scope.error });
      return;
    }

    const overview = await getStatsOverview({
      days: Number.isFinite(days) ? days : 30,
      entityId: scope.entityId || null,
    });

    res.json({ overview });
  } catch (error) {
    next(error);
  }
});
