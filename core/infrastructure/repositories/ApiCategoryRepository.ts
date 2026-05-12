import type { CategoryDto } from "@/core/application/dtos/CategoryDto";
import { toCategoryTree } from "@/core/application/mappers/CategoryMapper";
import type { Category } from "@/core/domain/entities/Category";
import type { ICategoryRepository } from "@/core/domain/repositories/ICategoryRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractCategoryList(res: unknown): CategoryDto[] {
  if (Array.isArray(res)) return res as CategoryDto[];
  if (res != null && typeof res === "object") {
    const r = res as Record<string, unknown>;
    const direct = r.data;
    if (Array.isArray(direct)) return direct as CategoryDto[];
    if (
      direct != null &&
      typeof direct === "object" &&
      !Array.isArray(direct)
    ) {
      const inner = direct as Record<string, unknown>;
      for (const k of ["items", "categories", "rows", "list"]) {
        const arr = inner[k];
        if (Array.isArray(arr)) return arr as CategoryDto[];
      }
    }
    for (const k of ["items", "categories", "rows", "list"]) {
      const arr = r[k];
      if (Array.isArray(arr)) return arr as CategoryDto[];
    }
  }
  return [];
}

export class ApiCategoryRepository implements ICategoryRepository {
  constructor(private readonly http: HttpClient) {}

  async listActiveTree(): Promise<Category[]> {
    const res = await this.http.get<unknown>(API_ENDPOINTS.CATEGORIES.LIST);
    return toCategoryTree(extractCategoryList(res));
  }
}
