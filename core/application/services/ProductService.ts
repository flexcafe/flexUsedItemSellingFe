import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProductRepository } from "@/core/domain/repositories/IProductRepository";
import type { PaginationParams } from "@/core/domain/types";
import type { Product } from "@/core/domain/entities/Product";
import type { ProductDto } from "../dtos/ProductDto";

export class ProductService implements IProductService {
  constructor(private readonly repo: IProductRepository) {}

  getAll(params?: PaginationParams): Promise<Product[]> {
    return this.repo.getAll(params);
  }

  getById(id: string): Promise<Product | null> {
    return this.repo.getById(id);
  }

  create(data: Omit<ProductDto, "id">): Promise<Product> {
    return this.repo.create(data);
  }

  update(id: string, data: Partial<ProductDto>): Promise<Product> {
    return this.repo.update(id, data);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
