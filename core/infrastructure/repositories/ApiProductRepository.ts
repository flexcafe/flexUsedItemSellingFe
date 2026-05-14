import type { ProductDto } from "@/core/application/dtos/ProductDto";
import {
  mapClientProductCatalogPage,
  toProduct,
  type ProductApiResponse,
} from "@/core/application/mappers/ProductMapper";
import type { Product } from "@/core/domain/entities/Product";
import type { IProductRepository } from "@/core/domain/repositories/IProductRepository";
import type { PaginationParams } from "@/core/domain/types";
import type {
  ClientProductCatalogPage,
  ClientProductListParams,
  ProductCreateInput,
  ProductDeleteInput,
  ProductStatus,
  ProductUpdateInput,
} from "@/core/domain/types/product";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

function buildClientProductQuery(
  params?: ClientProductListParams,
): Record<string, string | number> {
  const page = params?.page ?? 1;
  const rawLimit = params?.limit ?? 20;
  const limit = Math.min(50, Math.max(1, rawLimit));
  const query: Record<string, string | number> = { page, limit };
  const categoryId = params?.categoryId?.trim();
  if (categoryId) query.categoryId = categoryId;
  const search = params?.search?.trim();
  if (search) query.search = search;
  const lat = params?.latitude;
  const lng = params?.longitude;
  if (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng)
  ) {
    query.latitude = lat;
    query.longitude = lng;
    const r = params?.radiusKm;
    if (typeof r === "number" && Number.isFinite(r) && r > 0) {
      query.radiusKm = r;
    }
  }
  return query;
}

function buildPaginationQuery(
  params?: PaginationParams,
): Record<string, number> {
  const page = params?.page ?? 1;
  const rawLimit = params?.limit ?? 20;
  const limit = Math.min(50, Math.max(1, rawLimit));
  return { page, limit };
}

function asProductOrNull(raw: unknown): Product | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as ProductApiResponse;
  if (typeof row.id !== "string" || !row.id.trim()) return null;
  return toProduct(row);
}

function extractProductList(res: unknown): ProductDto[] {
  if (Array.isArray(res)) return res as ProductDto[];
  if (res != null && typeof res === "object") {
    const r = res as Record<string, unknown>;
    const direct = r.data;
    if (Array.isArray(direct)) return direct as ProductDto[];
    if (
      direct != null &&
      typeof direct === "object" &&
      !Array.isArray(direct)
    ) {
      const inner = direct as Record<string, unknown>;
      for (const k of ["items", "products", "rows", "list"]) {
        const arr = inner[k];
        if (Array.isArray(arr)) return arr as ProductDto[];
      }
    }
    for (const k of ["items", "products", "rows", "list"]) {
      const arr = r[k];
      if (Array.isArray(arr)) return arr as ProductDto[];
    }
  }
  return [];
}

function appendIfDefined(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  form.append(key, String(value));
}

function appendBoolean(form: FormData, key: string, value: boolean): void {
  // Some BE DTO transforms coerce multipart booleans using Boolean(value),
  // where "false" becomes true. Empty string safely coerces to false.
  form.append(key, value ? "true" : "");
}

function buildProductFormData(
  data: ProductCreateInput | ProductUpdateInput,
): FormData {
  const form = new FormData();

  appendIfDefined(form, "categoryId", data.categoryId);
  appendIfDefined(form, "title", data.title);
  appendIfDefined(form, "description", data.description);
  if ("price" in data) {
    appendIfDefined(form, "price", data.price);
  }
  appendIfDefined(form, "condition", data.condition);
  if ("status" in data) {
    appendIfDefined(form, "status", data.status);
  }
  appendIfDefined(form, "directTradeLocation", data.directTradeLocation);
  appendIfDefined(form, "directTradeLatitude", data.directTradeLatitude);
  appendIfDefined(form, "directTradeLongitude", data.directTradeLongitude);
  appendIfDefined(form, "nearbyLandmarks", data.nearbyLandmarks);
  appendIfDefined(form, "preferredTradeTime", data.preferredTradeTime);
  if (typeof data.isDeliveryAvailable === "boolean") {
    appendBoolean(form, "isDeliveryAvailable", data.isDeliveryAvailable);
  }

  if ("deliveryFeePayer" in data) {
    if (data.deliveryFeePayer != null) {
      appendIfDefined(form, "deliveryFeePayer", data.deliveryFeePayer);
    }
  }

  for (const method of data.paymentMethods ?? []) {
    form.append("paymentMethods", method);
  }

  for (const [idx, loc] of (data.preferredLocations ?? []).entries()) {
    form.append(`preferredLocations[${idx}][label]`, loc.label);
    form.append(`preferredLocations[${idx}][address]`, loc.address);
    appendIfDefined(form, `preferredLocations[${idx}][latitude]`, loc.latitude);
    appendIfDefined(
      form,
      `preferredLocations[${idx}][longitude]`,
      loc.longitude,
    );
  }

  for (const file of data.imageFiles ?? []) {
    form.append("images", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  if (data.mapScreenshotFile) {
    form.append("mapScreenshot", {
      uri: data.mapScreenshotFile.uri,
      name: data.mapScreenshotFile.name,
      type: data.mapScreenshotFile.type,
    } as unknown as Blob);
  }

  return form;
}

export class ApiProductRepository implements IProductRepository {
  constructor(private readonly http: HttpClient) {}

  async getAll(params?: PaginationParams): Promise<Product[]> {
    const query = { page: params?.page ?? 1, limit: params?.limit ?? 20 };
    const res = await this.http.get<unknown>(API_ENDPOINTS.PRODUCTS.LIST, {
      params: query,
    });
    const dtos = extractProductList(res);
    return dtos
      .filter((dto): dto is ProductDto & { id: string } => !!dto?.id)
      .map(toProduct);
  }

  async getClientList(
    params?: ClientProductListParams,
  ): Promise<ClientProductCatalogPage> {
    const res = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_PRODUCTS.LIST,
      {
        params: buildClientProductQuery(params),
      },
    );
    return mapClientProductCatalogPage(res);
  }

  async getMyList(
    params?: PaginationParams,
  ): Promise<ClientProductCatalogPage> {
    const res = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_PRODUCTS.MY_LIST,
      {
        params: buildPaginationQuery(params),
      },
    );
    return mapClientProductCatalogPage(res);
  }

  async getMyById(id: string): Promise<Product | null> {
    try {
      const dto = await this.http.get<unknown>(
        API_ENDPOINTS.CLIENT_PRODUCTS.MY_BY_ID(id),
      );
      return asProductOrNull(dto);
    } catch {
      return null;
    }
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const dto = await this.http.get<unknown>(
        API_ENDPOINTS.CLIENT_PRODUCTS.BY_ID(id),
      );
      return asProductOrNull(dto);
    } catch {
      return null;
    }
  }

  async create(data: ProductCreateInput): Promise<Product> {
    return this.createMy(data);
  }

  async createMy(data: ProductCreateInput): Promise<Product> {
    const dto = await this.http.postForm<unknown>(
      API_ENDPOINTS.CLIENT_PRODUCTS.CREATE,
      buildProductFormData(data),
    );
    const product = asProductOrNull(dto);
    if (!product) throw new Error("Create product response missing id");
    return product;
  }

  async update(id: string, data: ProductUpdateInput): Promise<Product> {
    return this.updateMy(id, data);
  }

  async updateMy(id: string, data: ProductUpdateInput): Promise<Product> {
    const dto = await this.http.patchForm<unknown>(
      API_ENDPOINTS.CLIENT_PRODUCTS.UPDATE(id),
      buildProductFormData(data),
    );
    const product = asProductOrNull(dto);
    if (!product) throw new Error("Update product response missing id");
    return product;
  }

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.updateMy(id, { status });
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(API_ENDPOINTS.PRODUCTS.DELETE(id));
  }

  async deleteMy(id: string, data: ProductDeleteInput): Promise<boolean> {
    const res = await this.http.delete<unknown>(
      API_ENDPOINTS.CLIENT_PRODUCTS.DELETE(id),
      {
        data,
      },
    );
    if (res == null || typeof res !== "object" || Array.isArray(res))
      return false;
    const r = res as Record<string, unknown>;
    return r.deleted === true;
  }
}
