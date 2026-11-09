import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const mediaRoot = path.resolve(__dirname, "../../media");

/** Shared/global content (product sets) */
export const GLOBAL_MEDIA_ENTITY = "global";

export function sanitizeEntityKey(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || GLOBAL_MEDIA_ENTITY;
}

export function entityFilesDir(entityKey: string): string {
  return path.join(mediaRoot, sanitizeEntityKey(entityKey), "files");
}

export function ensureMediaDir(entityKey = GLOBAL_MEDIA_ENTITY) {
  fs.mkdirSync(entityFilesDir(entityKey), { recursive: true });
}

export function publicMediaUrl(entityKey: string, filename: string): string {
  return `/media/${sanitizeEntityKey(entityKey)}/files/${filename}`;
}
