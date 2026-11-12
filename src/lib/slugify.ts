export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export function uniqueSlug(base: string, used: Set<string>) {
  let candidate = slugify(base);
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let suffix = 2;
  while (used.has(`${candidate}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${candidate}-${suffix}`;
  used.add(unique);
  return unique;
}
