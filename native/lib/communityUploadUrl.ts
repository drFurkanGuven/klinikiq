import { BASE_URL } from "./api";

/** Topluluk notu ekleri — /uploads/community-notes/... mutlak URL (web ile aynı mantık). */
export function resolveCommunityUploadUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${encodeURI(clean)}`;
}
