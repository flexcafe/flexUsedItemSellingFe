import type { Id } from "@/core/domain/types";

export interface Product {
  id: Id;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
