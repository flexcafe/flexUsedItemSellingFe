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

export interface UploadFile {
  uri: string;
  name: string;
  type: "image/png" | "image/jpeg" | "image/webp";
}

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
  /** On **create**, required when `isDeliveryAvailable` is true. Omit when delivery is off (sending BUYER/SELLER while off → 400). */
  deliveryFeePayer?: ProductDeliveryFeePayer;
  /** Optional direct FE upload (multipart field: `images`, max 5). */
  imageFiles?: UploadFile[];
  /** Optional direct FE upload (multipart field: `mapScreenshot`, max 1). */
  mapScreenshotFile?: UploadFile | null;
  images?: string[];
  preferredLocations?: PreferredTradeLocationInput[];
}

export type ProductUpdateInput = Partial<
  Omit<ProductCreateInput, "price" | "deliveryFeePayer">
> & {
  status?: ProductStatus;
  /** When delivery is off, omit or send `null` (never BUYER/SELLER). */
  deliveryFeePayer?: ProductDeliveryFeePayer | null;
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
