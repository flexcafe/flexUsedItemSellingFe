import type { Category } from "@/core/domain/entities/Category";
import type { ICategoryRepository } from "@/core/domain/repositories/ICategoryRepository";
import type { ICategoryService } from "@/core/domain/services/ICategoryService";

export class CategoryService implements ICategoryService {
  constructor(private readonly repo: ICategoryRepository) {}

  listActiveTree(): Promise<Category[]> {
    return this.repo.listActiveTree();
  }
}
