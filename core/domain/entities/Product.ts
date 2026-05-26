import type { Id } from "@/core/domain/types";

export interface ProductSellerSummary {
  userId: string;
  nickname: string;
  avatar?: string | null;
  currentRank?: string | null;
  averageStars?: number | null;
  totalReviews?: number | null;
  referralCode?: string | null;
}

export interface ProductPreferredLocation {
  id?: string;
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  sortOrder?: number | null;
}

export interface Product {
  id: Id;
  sellerId?: string | null;
  name: string;
  description: string;
  price: number;
  status?: string;
  condition?: string;
  /** Legacy / human-readable category label when API sends it. */
  category: string;
  /** Listing category UUID from client catalog (`categoryId`). */
  categoryId?: string | null;
  paymentMethods?: string[];
  directTradeLocation?: string | null;
  directTradeLatitude?: number | null;
  directTradeLongitude?: number | null;
  mapScreenshotUrl?: string | null;
  nearbyLandmarks?: string | null;
  preferredTradeTime?: string | null;
  isDeliveryAvailable?: boolean;
  deliveryFeePayer?: string | null;
  images?: string[];
  preferredLocations?: ProductPreferredLocation[];
  seller?: ProductSellerSummary | null;
  activeDealChatRoomId?: string | null;
  viewCount?: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  /** Public catalog/detail only — pre-formatted age label from API (e.g. "3 h ago"). */
  createdAtDisplay?: string | null;
}
