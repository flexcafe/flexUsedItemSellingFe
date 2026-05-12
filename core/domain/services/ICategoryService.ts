import type { Category } from "@/core/domain/entities/Category";

export interface ICategoryService {
  listActiveTree(): Promise<Category[]>;
}
