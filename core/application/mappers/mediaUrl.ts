import { API_CONFIG } from "@/core/infrastructure/api/constants";

function apiOriginFromBaseUrl(baseUrl: string): string {
  const u = baseUrl.replace(/\/$/, "");
  if (u.endsWith("/api")) return u.slice(0, -4);
  return u;
}

/** Turn relative API paths into absolute URLs for `Image` / `uri`. */
export function toAbsoluteMediaUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  const origin = apiOriginFromBaseUrl(API_CONFIG.BASE_URL);
  return t.startsWith("/") ? `${origin}${t}` : `${origin}/${t}`;
}

export function pickStringFromRecord(
  o: Record<string, unknown>,
  keys: string[],
): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const AVATAR_URL_KEYS = [
  "url",
  "avatarUrl",
  "avatar_url",
  "fileUrl",
  "file_url",
  "publicUrl",
  "public_url",
  "path",
  "src",
  "href",
  "thumbnail",
  "thumbnailUrl",
  "thumbnail_url",
  "fullUrl",
  "full_url",
  "cdnUrl",
  "cdn_url",
  "signedUrl",
  "signed_url",
];

const AVATAR_NEST_KEYS = [
  "file",
  "media",
  "image",
  "data",
  "result",
  "payload",
  "asset",
  "storage",
];

/**
 * Avatar field from API may be string, object with `url`, or nested `{ file: { url } }`.
 */
export function extractAvatarStringFromUnknown(
  value: unknown,
  depth = 0,
): string {
  if (value == null || depth > 4) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object" || Array.isArray(value)) return "";
  const o = value as Record<string, unknown>;
  const direct = pickStringFromRecord(o, AVATAR_URL_KEYS);
  if (direct) return direct;
  for (const k of AVATAR_NEST_KEYS) {
    const inner = o[k];
    const nested = extractAvatarStringFromUnknown(inner, depth + 1);
    if (nested) return nested;
  }
  return "";
}

/** True if `uri` is on the same host as the API (avatar may require Bearer). */
export function mediaUrlSharesApiOrigin(uri: string): boolean {
  const absolute = /^https?:\/\//i.test(uri) ? uri : toAbsoluteMediaUrl(uri);
  try {
    const u = new URL(absolute);
    const apiBase = API_CONFIG.BASE_URL.replace(/\/$/, "");
    const apiOrigin = new URL(
      apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase,
    ).origin;
    return u.origin === apiOrigin;
  } catch {
    return false;
  }
}

/**
 * Pull avatar string from `/me`-style user JSON (profile / Profile / flat fields).
 */
export function extractAvatarFromUserPayload(payload: unknown): string {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }
  const r = payload as Record<string, unknown>;
  const root =
    (typeof r.avatarUrl === "string" && r.avatarUrl.trim()
      ? r.avatarUrl.trim()
      : "") ||
    extractAvatarStringFromUnknown(r.avatar) ||
    pickStringFromRecord(r, [
      "avatarUrl",
      "avatar_url",
      "photoUrl",
      "photo_url",
      "imageUrl",
      "image_url",
    ]);
  const prof = r.profile ?? r.Profile ?? r.userProfile;
  let fromProfile = "";
  if (prof != null && typeof prof === "object" && !Array.isArray(prof)) {
    const p = prof as Record<string, unknown>;
    fromProfile =
      extractAvatarStringFromUnknown(p.avatar) ||
      pickStringFromRecord(p, [
        "avatarUrl",
        "avatar_url",
        "photoUrl",
        "photo_url",
        "imageUrl",
        "image_url",
        "picture",
      ]);
  }
  return root || fromProfile;
}
