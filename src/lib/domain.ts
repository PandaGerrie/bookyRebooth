/** Normalize host/domain values for comparison (strip protocol, path, port, www). */
export function normalizeHost(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]!
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function isLocalHost(host: string) {
  const normalized = normalizeHost(host);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".localhost")
  );
}

/**
 * Returns null when allowed, otherwise an error message.
 * Empty configured domain = no restriction (useful during setup).
 * Localhost is always allowed for development.
 */
export function assertHostAllowed(
  configuredDomain: string | null | undefined,
  requestHost: string | null | undefined,
): string | null {
  if (!configuredDomain?.trim()) return null;
  if (!requestHost?.trim()) {
    return "Host ontbreekt voor domeincontrole";
  }
  if (isLocalHost(requestHost)) return null;

  const allowed = normalizeHost(configuredDomain);
  const incoming = normalizeHost(requestHost);
  if (allowed !== incoming) {
    return "Dit domein hoort niet bij deze entiteit";
  }
  return null;
}
