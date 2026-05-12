import type { Category } from "@/core/domain/entities/Category";

export interface ICategoryRepository {
  listActiveTree(): Promise<Category[]>;
}
