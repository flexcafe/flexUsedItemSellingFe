import type { Product } from "@/core/domain/entities/Product";
import type { AppLocale } from "@/core/domain/types/locale";

export type PreferredLocationDetail = {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export function productImageUrls(product: Product): string[] {
  const fromList = (product.images ?? []).filter((u) => u.trim().length > 0);
  if (fromList.length > 0) return fromList;
  if (product.imageUrl?.trim()) return [product.imageUrl.trim()];
  return [];
}

export function parsePreferredLocations(
  raw: unknown,
): PreferredLocationDetail[] {
  if (!Array.isArray(raw)) return [];
  const out: PreferredLocationDetail[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const address = typeof row.address === "string" ? row.address.trim() : "";
    const lat =
      typeof row.latitude === "number"
        ? row.latitude
        : typeof row.latitude === "string"
          ? Number(row.latitude)
          : undefined;
    const lng =
      typeof row.longitude === "number"
        ? row.longitude
        : typeof row.longitude === "string"
          ? Number(row.longitude)
          : undefined;
    if (!label && !address) continue;
    out.push({
      label,
      address,
      ...(Number.isFinite(lat) ? { latitude: lat as number } : {}),
      ...(Number.isFinite(lng) ? { longitude: lng as number } : {}),
    });
  }
  return out;
}

export function formatListingDate(iso: string | undefined, locale: AppLocale): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tag =
    locale === "ko" ? "ko-KR" : locale === "zh" ? "zh-CN" : "en-US";
  return d.toLocaleString(tag, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function hasTradeCoordinates(product: Product): boolean {
  return (
    product.directTradeLatitude != null &&
    product.directTradeLongitude != null &&
    Number.isFinite(product.directTradeLatitude) &&
    Number.isFinite(product.directTradeLongitude)
  );
}
