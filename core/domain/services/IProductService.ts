import type { Product } from "../entities/Product";
import type { PaginationParams } from "@/core/domain/types";
import type {
  ClientProductCatalogPage,
  ClientProductListParams,
  ProductDeleteInput,
  ProductCreateInput,
  ProductStatus,
  ProductUpdateInput,
} from "@/core/domain/types/product";

export interface IProductService {
  getAll(params?: PaginationParams): Promise<Product[]>;
  getClientList(params?: ClientProductListParams): Promise<ClientProductCatalogPage>;
  getMyList(params?: PaginationParams): Promise<ClientProductCatalogPage>;
  getMyById(id: string): Promise<Product | null>;
  getById(id: string): Promise<Product | null>;
  create(data: ProductCreateInput): Promise<Product>;
  createMy(data: ProductCreateInput): Promise<Product>;
  update(id: string, data: ProductUpdateInput): Promise<Product>;
  updateMy(id: string, data: ProductUpdateInput): Promise<Product>;
  updateStatus(id: string, status: ProductStatus): Promise<Product>;
  delete(id: string): Promise<void>;
  deleteMy(id: string, data: ProductDeleteInput): Promise<boolean>;
}
