import type { Product } from "../entities/Product";
import type { PaginationParams } from "@/core/domain/types";
import type { ProductCreateInput, ProductUpdateInput } from "@/core/domain/types/product";

export interface IProductRepository {
  getAll(params?: PaginationParams): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(data: ProductCreateInput): Promise<Product>;
  update(id: string, data: ProductUpdateInput): Promise<Product>;
  delete(id: string): Promise<void>;
}
