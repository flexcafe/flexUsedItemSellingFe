import type { Product } from "../entities/Product";
import type { ProductDto } from "@/core/application/dtos/ProductDto";
import type { PaginationParams } from "@/core/domain/types";

export interface IProductRepository {
  getAll(params?: PaginationParams): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(data: Omit<ProductDto, "id">): Promise<Product>;
  update(id: string, data: Partial<ProductDto>): Promise<Product>;
  delete(id: string): Promise<void>;
}
