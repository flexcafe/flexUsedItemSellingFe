import type { Product } from "@/core/domain/entities/Product";
import type { ProductDto } from "../dtos/ProductDto";

interface ProductApiResponse extends Omit<ProductDto, "id" | "price"> {
  id: string;
  price?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

function parsePrice(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return Number(val) || 0;
}

export function toProduct(dto: ProductApiResponse): Product {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    price: parsePrice(dto.price),
    category: dto.category ?? "",
    imageUrl: dto.imageUrl ?? null,
    isAvailable: dto.isAvailable ?? true,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
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
