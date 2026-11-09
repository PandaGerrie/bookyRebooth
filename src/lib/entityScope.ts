import type { AuthUser } from "../types/express.js";

export function resolveEntityIdForWrite(
  user: AuthUser,
  requestedEntityId?: string | null,
): { entityId: string } | { error: string; status: number } {
  if (user.role === "ENTITY_ADMIN") {
    if (!user.entityId) {
      return { error: "Entity admin is not linked to an entity", status: 403 };
    }
    if (requestedEntityId && requestedEntityId !== user.entityId) {
      return { error: "Forbidden for this entity", status: 403 };
    }
    return { entityId: user.entityId };
  }

  if (!requestedEntityId) {
    return { error: "entityId is required", status: 400 };
  }

  return { entityId: requestedEntityId };
}

export function resolveEntityFilter(
  user: AuthUser,
  queryEntityId?: string | null,
): { entityId?: string } | { error: string; status: number } {
  if (user.role === "ENTITY_ADMIN") {
    if (!user.entityId) {
      return { error: "Entity admin is not linked to an entity", status: 403 };
    }
    return { entityId: user.entityId };
  }

  if (queryEntityId) {
    return { entityId: queryEntityId };
  }

  return {};
}
