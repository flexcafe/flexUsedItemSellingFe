import type { Product } from "@/core/domain/entities/Product";
import type { PaginationParams } from "@/core/domain/types";

export type ProductCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";

export type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SOLD"
  | "INACTIVE"
  | "DELETED";

export type ProductPaymentMethod = "CASH" | "KBZPAY";
export type ProductDeliveryFeePayer = "BUYER" | "SELLER";

export interface PreferredTradeLocationInput {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface ProductCreateInput {
  categoryId: string;
  title: string;
  description: string;
  price: number;
  condition: ProductCondition;
  paymentMethods: ProductPaymentMethod[];
  directTradeLocation?: string;
  directTradeLatitude?: number;
  directTradeLongitude?: number;
  mapScreenshotUrl?: string;
  nearbyLandmarks?: string;
  preferredTradeTime?: string;
  isDeliveryAvailable: boolean;
  deliveryFeePayer?: ProductDeliveryFeePayer;
  images?: string[];
  preferredLocations?: PreferredTradeLocationInput[];
}

export type ProductUpdateInput = Partial<Omit<ProductCreateInput, "price">> & {
  status?: ProductStatus;
};

export interface ProductDeleteInput {
  confirmTitle: string;
}

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

/** `GET /v1/client/products/my` — seller's own listings page. */
export type MyProductListPage = ClientProductCatalogPage;
