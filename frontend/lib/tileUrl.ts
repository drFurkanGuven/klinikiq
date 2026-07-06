/** Wikimedia tam URL veya /tiles/... yollarını tarayıcıda kullanılabilir mutlak URL yapar. */
export function resolvePublicAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.replace(/^\/+/, "");
  const finalPath = clean.startsWith("tiles/") ? `/${clean}` : `/tiles/${clean}`;
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${encodeURI(finalPath)}`;
}
