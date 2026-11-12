import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { entity: true },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.role === "ENTITY_ADMIN" && user.entity && !user.entity.active) {
      res.status(403).json({ error: "Entity is inactive" });
      return;
    }

    const lastLoggedInAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoggedInAt },
    });

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      entityId: user.entityId,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        entityId: user.entityId,
        lastLoggedInAt: lastLoggedInAt.toISOString(),
        entity: user.entity
          ? {
              id: user.entity.id,
              name: user.entity.name,
              slug: user.entity.slug,
              active: user.entity.active,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        entityId: true,
        createdAt: true,
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Huidig wachtwoord is onjuist" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
