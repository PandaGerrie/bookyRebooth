import { Prisma } from "@prisma/client";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { createUserSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

const userSelect = {
  id: true,
  email: true,
  role: true,
  entityId: true,
  createdAt: true,
  entity: {
    select: { id: true, name: true, slug: true },
  },
} as const;

usersRouter.get("/", async (req, res, next) => {
  try {
    const current = req.user!;

    if (current.role === "SUPER_ADMIN") {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: userSelect,
      });

      res.json({ users });
      return;
    }

    if (!current.entityId) {
      res.status(403).json({ error: "Entity admin is not linked to an entity" });
      return;
    }

    const users = await prisma.user.findMany({
      where: { entityId: current.entityId },
      orderBy: { createdAt: "desc" },
      select: userSelect,
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const current = req.user!;
    const body = createUserSchema.parse(req.body);

    let role: "SUPER_ADMIN" | "ENTITY_ADMIN";
    let entityId: string | null;

    if (current.role === "SUPER_ADMIN") {
      role = body.role ?? "ENTITY_ADMIN";
      if (role === "SUPER_ADMIN") {
        entityId = null;
      } else {
        if (!body.entityId) {
          res.status(400).json({ error: "ENTITY_ADMIN requires an entityId" });
          return;
        }
        const entity = await prisma.entity.findUnique({
          where: { id: body.entityId },
          select: { id: true },
        });
        if (!entity) {
          res.status(400).json({ error: "entityId does not exist" });
          return;
        }
        entityId = body.entityId;
      }
    } else if (current.role === "ENTITY_ADMIN") {
      if (!current.entityId) {
        res
          .status(403)
          .json({ error: "Entity admin is not linked to an entity" });
        return;
      }
      // Entity admins can only create peers in their own entity.
      role = "ENTITY_ADMIN";
      entityId = current.entityId;
    } else {
      res.status(403).json({ error: "Geen rechten om gebruikers aan te maken" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    try {
      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          role,
          entityId,
        },
        select: userSelect,
      });

      res.status(201).json({ user });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({ error: "Dit e-mailadres is al in gebruik" });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});
