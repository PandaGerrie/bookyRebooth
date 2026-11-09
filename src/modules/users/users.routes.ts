import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { createUserSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", async (req, res, next) => {
  try {
    const current = req.user!;

    if (current.role === "SUPER_ADMIN") {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          entityId: true,
          createdAt: true,
          entity: {
            select: { id: true, name: true, slug: true },
          },
        },
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
      select: {
        id: true,
        email: true,
        role: true,
        entityId: true,
        createdAt: true,
        entity: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const current = req.user!;

    if (current.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Only SUPER_ADMIN can create users" });
      return;
    }

    const body = createUserSchema.parse(req.body);

    if (body.role === "ENTITY_ADMIN" && body.entityId) {
      const entity = await prisma.entity.findUnique({
        where: { id: body.entityId },
      });

      if (!entity) {
        res.status(400).json({ error: "entityId does not exist" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        entityId: body.role === "ENTITY_ADMIN" ? body.entityId! : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        entityId: true,
        createdAt: true,
        entity: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});
