import type { Product } from "@/core/domain/entities/Product";
import type { PaginationParams } from "@/core/domain/types";

export interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export interface ClientProductListParams extends PaginationParams {
  categoryId?: string;
  /** Case-insensitive substring on title / description (backend ILIKE). */
  search?: string;
  /** WGS84 — send together with `longitude` so the catalog is ordered nearest-first. */
  latitude?: number;
  longitude?: number;
  /** Requires both latitude and longitude when set. */
  radiusKm?: number;
}

/** `GET /v1/client/products` — `data` after `ApiResponseDto` unwrap (PaginatedResponseDto). */
export interface ClientProductCatalogPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

