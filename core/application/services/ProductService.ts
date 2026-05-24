import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProductRepository } from "@/core/domain/repositories/IProductRepository";
import type { PaginationParams } from "@/core/domain/types";
import type { Product } from "@/core/domain/entities/Product";
import type {
  ClientProductCatalogPage,
  ClientProductListParams,
  MyProductListParams,
  ProductDeleteInput,
  ProductCreateInput,
  ProductStatus,
  PublicUserProfile,
  SellerReviewPage,
  ProductUpdateInput,
} from "@/core/domain/types/product";

export class ProductService implements IProductService {
  constructor(private readonly repo: IProductRepository) {}

  getAll(params?: PaginationParams): Promise<Product[]> {
    return this.repo.getAll(params);
  }

  getClientList(params?: ClientProductListParams): Promise<ClientProductCatalogPage> {
    return this.repo.getClientList(params);
  }

  getMyList(params?: MyProductListParams): Promise<ClientProductCatalogPage> {
    return this.repo.getMyList(params);
  }

  getMyById(id: string): Promise<Product | null> {
    return this.repo.getMyById(id);
  }

  getById(id: string): Promise<Product | null> {
    return this.repo.getById(id);
  }

  getSellerReviews(
    userId: string,
    params?: PaginationParams,
  ): Promise<SellerReviewPage> {
    return this.repo.getSellerReviews(userId, params);
  }

  getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    return this.repo.getPublicProfile(userId);
  }

  create(data: ProductCreateInput): Promise<Product> {
    return this.repo.create(data);
  }

  createMy(data: ProductCreateInput): Promise<Product> {
    return this.repo.createMy(data);
  }

  update(id: string, data: ProductUpdateInput): Promise<Product> {
    return this.repo.update(id, data);
  }

  updateMy(id: string, data: ProductUpdateInput): Promise<Product> {
    return this.repo.updateMy(id, data);
  }

  updateStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.repo.updateStatus(id, status);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  deleteMy(id: string, data: ProductDeleteInput): Promise<boolean> {
    return this.repo.deleteMy(id, data);
  }
}
