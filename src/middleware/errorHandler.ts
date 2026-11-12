import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message;
    res.status(400).json({
      error: firstIssue || "Validation failed",
      details: err.flatten(),
    });
    return;
  }

  if (typeof err === "object" && err && "code" in err && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "Bestand is te groot (max 5MB)" });
    return;
  }

  if (err instanceof Error && err.message === "Alleen afbeeldingen zijn toegestaan") {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Unique constraint violation", meta: err.meta });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
