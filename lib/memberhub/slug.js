export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[đĐ]/g, "d")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function routeSlug(row) {
  return slugify(row?.slug) || slugify(row?.name) || (row?.id ? `item-${row.id}` : "");
}

export function routePathFor(...parts) {
  const segments = parts.flat().map(slugify).filter(Boolean);
  return segments.length ? `/${segments.join("/")}` : "";
}

export function normalizeRoutePath(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return routePathFor(text.split("/").filter(Boolean));
}
