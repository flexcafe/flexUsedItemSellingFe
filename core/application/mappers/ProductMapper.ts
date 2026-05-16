import type { Product } from "@/core/domain/entities/Product";
import type { ClientProductCatalogPage } from "@/core/domain/types/product";
import type { ProductDto } from "../dtos/ProductDto";
import { pickStringFromRecord, toAbsoluteMediaUrl } from "./mediaUrl";

export interface ProductApiResponse {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  price?: unknown;
  category?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
  images?: unknown;
  status?: string | null;
  condition?: string | null;
  paymentMethods?: unknown;
  directTradeLocation?: unknown;
  directTradeLatitude?: unknown;
  directTradeLongitude?: unknown;
  mapScreenshotUrl?: unknown;
  nearbyLandmarks?: unknown;
  preferredTradeTime?: unknown;
  isDeliveryAvailable?: boolean | null;
  deliveryFeePayer?: unknown;
  preferredLocations?: unknown;
  sellerId?: string | null;
  viewCount?: number | null;
  isAvailable?: boolean | null;
  createdAt?: string | null;
  createdAtDisplay?: string | null;
  updatedAt?: string | null;
  seller?: unknown;
}

function parsePrice(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return Number(val) || 0;
}

function imageUrlFromUnknown(el: unknown): string {
  if (typeof el === "string" && el.trim()) {
    return toAbsoluteMediaUrl(el.trim());
  }
  if (el != null && typeof el === "object" && !Array.isArray(el)) {
    const u = pickStringFromRecord(el as Record<string, unknown>, [
      "url",
      "src",
      "href",
      "publicUrl",
      "public_url",
    ]);
    if (u) return toAbsoluteMediaUrl(u);
  }
  return "";
}

function firstImageFromImages(images: unknown): string {
  if (!Array.isArray(images)) return "";
  for (const el of images) {
    const u = imageUrlFromUnknown(el);
    if (u) return u;
  }
  return "";
}

function allImagesFromImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const el of images) {
    const u = imageUrlFromUnknown(el);
    if (u) out.push(u);
  }
  return out;
}

function displayTitle(dto: ProductApiResponse): string {
  const fromTitle = typeof dto.title === "string" ? dto.title.trim() : "";
  if (fromTitle) return fromTitle;
  const fromName = typeof dto.name === "string" ? dto.name.trim() : "";
  if (fromName) return fromName;
  return "Listing";
}

function displayCategory(dto: ProductApiResponse): string {
  const named =
    typeof dto.categoryName === "string" ? dto.categoryName.trim() : "";
  if (named) return named;
  const cat = typeof dto.category === "string" ? dto.category.trim() : "";
  return cat;
}

function catalogImageUrl(dto: ProductApiResponse): string | null {
  const fromImages = firstImageFromImages(dto.images);
  if (fromImages) return fromImages;
  if (typeof dto.imageUrl === "string" && dto.imageUrl.trim()) {
    return toAbsoluteMediaUrl(dto.imageUrl.trim());
  }
  return null;
}

function deriveIsAvailable(status: unknown): boolean {
  if (typeof status !== "string") return true;
  const s = status.toUpperCase();
  return s !== "SOLD" && s !== "DELETED" && s !== "REMOVED";
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function parseSellerSummary(
  raw: unknown,
): Product["seller"] {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const userId = typeof r.userId === "string" ? r.userId.trim() : "";
  const nickname = typeof r.nickname === "string" ? r.nickname.trim() : "";
  if (!userId || !nickname) return null;
  return {
    userId,
    nickname,
    avatar:
      typeof r.avatar === "string" && r.avatar.trim()
        ? toAbsoluteMediaUrl(r.avatar.trim())
        : null,
    currentRank: toStringOrNull(r.currentRank),
    averageStars:
      typeof r.averageStars === "number" && Number.isFinite(r.averageStars)
        ? r.averageStars
        : null,
    totalReviews:
      typeof r.totalReviews === "number" && Number.isFinite(r.totalReviews)
        ? r.totalReviews
        : null,
  };
}

function parsePreferredLocations(raw: unknown): Product["preferredLocations"] {
  if (!Array.isArray(raw)) return [];
  const out: NonNullable<Product["preferredLocations"]> = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const address = typeof row.address === "string" ? row.address.trim() : "";
    if (!label && !address) continue;
    out.push({
      id: toStringOrNull(row.id) ?? undefined,
      label,
      address,
      latitude: toNumberOrNull(row.latitude),
      longitude: toNumberOrNull(row.longitude),
      sortOrder:
        typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
          ? row.sortOrder
          : null,
    });
  }
  out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return out;
}

export function toProduct(dto: ProductApiResponse): Product {
  const categoryId =
    typeof dto.categoryId === "string" && dto.categoryId.trim()
      ? dto.categoryId.trim()
      : null;
  const fromStatus = deriveIsAvailable(dto.status);
  const isAvailable = dto.isAvailable === false ? false : fromStatus;
  const imageUrls = allImagesFromImages(dto.images);
  const primaryImage =
    imageUrls[0] ??
    (typeof dto.imageUrl === "string" && dto.imageUrl.trim()
      ? toAbsoluteMediaUrl(dto.imageUrl.trim())
      : null);
  return {
    id: dto.id,
    sellerId: toStringOrNull(dto.sellerId),
    name: displayTitle(dto),
    description: typeof dto.description === "string" ? dto.description : "",
    price: parsePrice(dto.price),
    status: typeof dto.status === "string" ? dto.status : undefined,
    condition: typeof dto.condition === "string" ? dto.condition : undefined,
    category: displayCategory(dto),
    categoryId,
    paymentMethods: toStringArray(dto.paymentMethods),
    directTradeLocation: toStringOrNull(dto.directTradeLocation),
    directTradeLatitude: toNumberOrNull(dto.directTradeLatitude),
    directTradeLongitude: toNumberOrNull(dto.directTradeLongitude),
    mapScreenshotUrl: toStringOrNull(dto.mapScreenshotUrl),
    nearbyLandmarks: toStringOrNull(dto.nearbyLandmarks),
    preferredTradeTime: toStringOrNull(dto.preferredTradeTime),
    isDeliveryAvailable:
      typeof dto.isDeliveryAvailable === "boolean"
        ? dto.isDeliveryAvailable
        : undefined,
    deliveryFeePayer: toStringOrNull(dto.deliveryFeePayer),
    images: imageUrls.length > 0 ? imageUrls : toStringArray(dto.images),
    preferredLocations: parsePreferredLocations(dto.preferredLocations),
    seller: parseSellerSummary(dto.seller),
    viewCount:
      typeof dto.viewCount === "number" && Number.isFinite(dto.viewCount)
        ? dto.viewCount
        : undefined,
    imageUrl: primaryImage ?? catalogImageUrl(dto),
    isAvailable,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
    createdAtDisplay: toStringOrNull(dto.createdAtDisplay),
  };
}

const CATALOG_META_DEFAULT = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
} as const;

function readNum(
  r: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const v = r[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function readBool(
  r: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const v = r[key];
  if (typeof v === "boolean") return v;
  return fallback;
}

/**
 * Maps unwrapped `PaginatedResponseDto` from `GET /v1/client/products` into domain models.
 */
export function mapClientProductCatalogPage(
  data: unknown,
): ClientProductCatalogPage {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return { ...CATALOG_META_DEFAULT, items: [] };
  }
  const r = data as Record<string, unknown>;
  const itemsRaw = r.items;
  const items: Product[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter(
          (row): row is ProductApiResponse =>
            row != null &&
            typeof row === "object" &&
            !Array.isArray(row) &&
            typeof (row as ProductApiResponse).id === "string" &&
            !!(row as ProductApiResponse).id?.trim(),
        )
        .map((row) => toProduct(row as ProductApiResponse))
    : [];

  const page = readNum(r, "page", 1);
  const limit = readNum(r, "limit", 20);
  const total = readNum(r, "total", items.length);
  const totalPages = readNum(r, "totalPages", 0);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: readBool(r, "hasNextPage", false),
    hasPrevPage: readBool(r, "hasPrevPage", false),
  };
}

export function toProductDto(product: Partial<Product>): ProductDto {
  return {
    ...(product.id && { id: product.id }),
    title: product.name ?? "",
    description: product.description ?? "",
    price: product.price ?? 0,
    category: product.category ?? "",
    categoryId: product.categoryId ?? null,
    status: product.status ?? null,
    condition: product.condition ?? null,
    paymentMethods: product.paymentMethods ?? [],
    directTradeLocation: product.directTradeLocation ?? null,
    directTradeLatitude: product.directTradeLatitude ?? null,
    directTradeLongitude: product.directTradeLongitude ?? null,
    mapScreenshotUrl: product.mapScreenshotUrl ?? null,
    nearbyLandmarks: product.nearbyLandmarks ?? null,
    preferredTradeTime: product.preferredTradeTime ?? null,
    isDeliveryAvailable: product.isDeliveryAvailable ?? null,
    deliveryFeePayer: product.deliveryFeePayer ?? null,
    images: product.images ?? [],
    preferredLocations: product.preferredLocations ?? [],
    sellerId: product.sellerId ?? null,
    viewCount: product.viewCount ?? null,
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable ?? true,
  };
}
