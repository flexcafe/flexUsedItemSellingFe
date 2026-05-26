export interface ProductDto {
  id?: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  condition?: string | null;
  status?: string | null;
  paymentMethods?: unknown;
  directTradeLocation?: unknown;
  directTradeLatitude?: unknown;
  directTradeLongitude?: unknown;
  mapScreenshotUrl?: unknown;
  nearbyLandmarks?: unknown;
  preferredTradeTime?: unknown;
  isDeliveryAvailable?: boolean | null;
  deliveryFeePayer?: unknown;
  images?: unknown;
  preferredLocations?: unknown;
  seller?: unknown;
  activeDealChatRoomId?: string | null;
  sellerId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  category?: string | null;
  viewCount?: number | null;
  createdAt?: string | null;
  /** Public catalog/detail — server-formatted listing age. */
  createdAtDisplay?: string | null;
  updatedAt?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean | null;
}
