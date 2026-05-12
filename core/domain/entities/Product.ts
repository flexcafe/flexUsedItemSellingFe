import type { Id } from "@/core/domain/types";

export interface Product {
  id: Id;
  name: string;
  description: string;
  price: number;
  /** Legacy / human-readable category label when API sends it. */
  category: string;
  /** Listing category UUID from client catalog (`categoryId`). */
  categoryId?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
