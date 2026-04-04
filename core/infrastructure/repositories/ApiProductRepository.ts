import type {
  IProductRepository,
} from "@/core/domain/repositories/IProductRepository";
import type { Product } from "@/core/domain/entities/Product";
import type { ProductDto } from "@/core/application/dtos/ProductDto";
import type { PaginationParams } from "@/core/domain/types";
import { toProduct } from "@/core/application/mappers/ProductMapper";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

export class ApiProductRepository implements IProductRepository {
  constructor(private readonly http: HttpClient) {}

  async getAll(params?: PaginationParams): Promise<Product[]> {
    const query = { page: params?.page ?? 1, limit: params?.limit ?? 20 };
    const res = await this.http.get<
      ProductDto[] | { data?: ProductDto[] }
    >(API_ENDPOINTS.PRODUCTS.LIST, { params: query });

    const list = Array.isArray(res) ? res : (res as { data?: ProductDto[] })?.data ?? [];
    const dtos = Array.isArray(list) ? list : [];
    return dtos
      .filter((dto): dto is ProductDto & { id: string } => !!dto?.id)
      .map(toProduct);
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const dto = await this.http.get<ProductDto & { id: string }>(
        API_ENDPOINTS.PRODUCTS.BY_ID(id)
      );
      return dto?.id ? toProduct(dto) : null;
    } catch {
      return null;
    }
  }

  async create(data: Omit<ProductDto, "id">): Promise<Product> {
    const dto = await this.http.post<ProductDto & { id: string }>(
      API_ENDPOINTS.PRODUCTS.CREATE,
      data
    );
    if (!dto?.id) throw new Error("Create product response missing id");
    return toProduct(dto);
  }

  async update(id: string, data: Partial<ProductDto>): Promise<Product> {
    const dto = await this.http.patch<ProductDto & { id: string }>(
      API_ENDPOINTS.PRODUCTS.UPDATE(id),
      data
    );
    return toProduct({ ...dto, id: dto?.id ?? id } as ProductDto & {
      id: string;
    });
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(API_ENDPOINTS.PRODUCTS.DELETE(id));
  }
}
