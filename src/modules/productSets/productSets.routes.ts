import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
  createProductSetSchema,
  updateProductSetSchema,
} from "./productSets.schemas.js";

export const productSetsRouter = Router();

productSetsRouter.use(requireAuth);

const productInclude = {
  products: {
    orderBy: { sortOrder: "asc" as const },
  },
};

productSetsRouter.get("/", async (_req, res, next) => {
  try {
    const productSets = await prisma.productSet.findMany({
      orderBy: { name: "asc" },
      include: productInclude,
    });
    res.json({ productSets });
  } catch (error) {
    next(error);
  }
});

productSetsRouter.get("/:id", async (req, res, next) => {
  try {
    const productSet = await prisma.productSet.findUnique({
      where: { id: req.params.id },
      include: productInclude,
    });

    if (!productSet) {
      res.status(404).json({ error: "Product set niet gevonden" });
      return;
    }

    res.json({ productSet });
  } catch (error) {
    next(error);
  }
});

productSetsRouter.post("/", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const body = createProductSetSchema.parse(req.body);

    const productSet = await prisma.productSet.create({
      data: {
        name: body.name,
        products: {
          create: body.products.map((product, index) => ({
            name: product.name,
            photoUrl: product.photoUrl,
            sortOrder: index,
          })),
        },
      },
      include: productInclude,
    });

    res.status(201).json({ productSet });
  } catch (error) {
    next(error);
  }
});

productSetsRouter.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = updateProductSetSchema.parse(req.body);

      const existing = await prisma.productSet.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({ error: "Product set niet gevonden" });
        return;
      }

      const productSet = await prisma.$transaction(async (tx) => {
        await tx.productSetItem.deleteMany({
          where: { productSetId: id },
        });

        return tx.productSet.update({
          where: { id },
          data: {
            name: body.name,
            products: {
              create: body.products.map((product, index) => ({
                name: product.name,
                photoUrl: product.photoUrl,
                sortOrder: index,
              })),
            },
          },
          include: productInclude,
        });
      });

      res.json({ productSet });
    } catch (error) {
      next(error);
    }
  },
);

productSetsRouter.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      await prisma.productSet.delete({ where: { id: String(req.params.id) } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
