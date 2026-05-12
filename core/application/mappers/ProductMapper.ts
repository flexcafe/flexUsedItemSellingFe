import type { ClientProductCatalogPage } from "@/core/domain/types/product";
import type { Product } from "@/core/domain/entities/Product";
import type { ProductDto } from "../dtos/ProductDto";
import {
  pickStringFromRecord,
  toAbsoluteMediaUrl,
} from "./mediaUrl";

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
  isAvailable?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

function parsePrice(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return Number(val) || 0;
}

function firstImageFromImages(images: unknown): string {
  if (!Array.isArray(images)) return "";
  for (const el of images) {
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
  }
  return "";
}

function displayTitle(dto: ProductApiResponse): string {
  const fromTitle =
    typeof dto.title === "string" ? dto.title.trim() : "";
  if (fromTitle) return fromTitle;
  const fromName =
    typeof dto.name === "string" ? dto.name.trim() : "";
  if (fromName) return fromName;
  return "Listing";
}

function displayCategory(dto: ProductApiResponse): string {
  const named =
    typeof dto.categoryName === "string" ? dto.categoryName.trim() : "";
  if (named) return named;
  const cat =
    typeof dto.category === "string" ? dto.category.trim() : "";
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

export function toProduct(dto: ProductApiResponse): Product {
  const categoryId =
    typeof dto.categoryId === "string" && dto.categoryId.trim()
      ? dto.categoryId.trim()
      : null;
  const fromStatus = deriveIsAvailable(dto.status);
  const isAvailable = dto.isAvailable === false ? false : fromStatus;
  return {
    id: dto.id,
    name: displayTitle(dto),
    description:
      typeof dto.description === "string" ? dto.description : "",
    price: parsePrice(dto.price),
    category: displayCategory(dto),
    categoryId,
    imageUrl: catalogImageUrl(dto),
    isAvailable,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
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

function readNum(r: Record<string, unknown>, key: string, fallback: number): number {
  const v = r[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function readBool(r: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = r[key];
  if (typeof v === "boolean") return v;
  return fallback;
}

/**
 * Maps unwrapped `PaginatedResponseDto` from `GET /v1/client/products` into domain models.
 */
export function mapClientProductCatalogPage(data: unknown): ClientProductCatalogPage {
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
    name: product.name ?? "",
    description: product.description ?? "",
    price: product.price ?? 0,
    category: product.category ?? "",
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable ?? true,
  };
}
