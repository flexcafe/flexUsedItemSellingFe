import type { Product } from "../entities/Product";
import type { PaginationParams } from "@/core/domain/types";
import type {
  ClientProductCatalogPage,
  ClientProductListParams,
  MyProductListParams,
  ProductCreateInput,
  ProductDeleteInput,
  ProductStatus,
  ProductUpdateInput,
  PublicUserProfile,
  SellerReviewPage,
} from "@/core/domain/types/product";

export interface IProductRepository {
  getAll(params?: PaginationParams): Promise<Product[]>;
  getClientList(params?: ClientProductListParams): Promise<ClientProductCatalogPage>;
  getMyList(params?: MyProductListParams): Promise<ClientProductCatalogPage>;
  getMyById(id: string): Promise<Product | null>;
  getById(id: string): Promise<Product | null>;
  getSellerReviews(
    userId: string,
    params?: PaginationParams,
  ): Promise<SellerReviewPage>;
  getPublicProfile(userId: string): Promise<PublicUserProfile | null>;
  create(data: ProductCreateInput): Promise<Product>;
  createMy(data: ProductCreateInput): Promise<Product>;
  update(id: string, data: ProductUpdateInput): Promise<Product>;
  updateMy(id: string, data: ProductUpdateInput): Promise<Product>;
  updateStatus(id: string, status: ProductStatus): Promise<Product>;
  delete(id: string): Promise<void>;
  deleteMy(id: string, data: ProductDeleteInput): Promise<boolean>;
}
