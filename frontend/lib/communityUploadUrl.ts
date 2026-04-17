/** Topluluk notu ekleri — /uploads/community-notes/... mutlak URL. */
export function resolveCommunityUploadUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${encodeURI(clean)}`;
}
