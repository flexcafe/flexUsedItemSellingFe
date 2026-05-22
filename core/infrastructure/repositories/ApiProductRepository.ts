import type { ProductDto } from "@/core/application/dtos/ProductDto";
import {
  extractAvatarStringFromUnknown,
  toAbsoluteMediaUrl,
} from "@/core/application/mappers/mediaUrl";
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
  PublicUserProfile,
  SellerReviewPage,
} from "@/core/domain/types/product";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

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

function mapSellerReviewPage(data: unknown): SellerReviewPage {
  const empty: SellerReviewPage = {
    starBreakdown: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 })),
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };
  if (data == null || typeof data !== "object" || Array.isArray(data))
    return empty;
  const r = data as Record<string, unknown>;
  const rawBreakdown = Array.isArray(r.starBreakdown) ? r.starBreakdown : [];
  const breakdownMap = new Map<number, number>();
  for (const row of rawBreakdown) {
    if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const stars = Number(item.stars);
    const count = Number(item.count);
    if (Number.isFinite(stars) && stars >= 1 && stars <= 5) {
      breakdownMap.set(
        Math.round(stars),
        Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
      );
    }
  }
  const starBreakdown = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: breakdownMap.get(stars) ?? 0,
  }));
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items = itemsRaw
    .filter(
      (row) => row != null && typeof row === "object" && !Array.isArray(row),
    )
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        stars: Number.isFinite(Number(item.stars))
          ? Math.max(1, Math.min(5, Math.round(Number(item.stars))))
          : 0,
        comment:
          typeof item.comment === "string" ? item.comment.trim() || null : null,
        reviewerNickname:
          typeof item.reviewerNickname === "string"
            ? item.reviewerNickname.trim() || null
            : null,
        reviewerAvatar:
          typeof item.reviewerAvatar === "string" && item.reviewerAvatar.trim()
            ? item.reviewerAvatar.trim()
            : null,
        createdAt:
          typeof item.createdAt === "string" && item.createdAt.trim()
            ? item.createdAt.trim()
            : null,
      };
    });
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    starBreakdown,
    items,
    total: num(r.total, items.length),
    page: Math.max(1, Math.round(num(r.page, 1))),
    limit: Math.max(1, Math.round(num(r.limit, 20))),
    totalPages: Math.max(0, Math.round(num(r.totalPages, 0))),
    hasNextPage: r.hasNextPage === true,
    hasPrevPage: r.hasPrevPage === true,
  };
}

function mapPublicUserProfile(data: unknown): PublicUserProfile | null {
  if (data == null || typeof data !== "object" || Array.isArray(data))
    return null;
  const row = data as Record<string, unknown>;
  const userId = typeof row.userId === "string" ? row.userId.trim() : "";
  if (!userId) return null;
  const nickname =
    typeof row.nickname === "string" && row.nickname.trim()
      ? row.nickname.trim()
      : "Seller";
  const rankRaw =
    typeof row.currentRank === "string"
      ? row.currentRank.trim().toUpperCase()
      : "NEWBIE";
  const allowedRanks = new Set(["NEWBIE", "BRONZE", "SILVER", "GOLD", "VIP"]);
  const currentRank = (
    allowedRanks.has(rankRaw) ? rankRaw : "NEWBIE"
  ) as PublicUserProfile["currentRank"];
  const avatarRaw = extractAvatarStringFromUnknown(row.avatar);
  const avatar = avatarRaw ? toAbsoluteMediaUrl(avatarRaw) : null;
  const region =
    typeof row.region === "string" && row.region.trim()
      ? row.region.trim()
      : null;
  const toNum = (value: unknown, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const memberSince =
    typeof row.memberSince === "string" && row.memberSince.trim()
      ? row.memberSince.trim()
      : null;
  const referralCode =
    typeof row.referralCode === "string" && row.referralCode.trim()
      ? row.referralCode.trim()
      : null;
  return {
    userId,
    nickname,
    avatar,
    referralCode,
    region,
    currentRank,
    averageStars: toNum(row.averageStars),
    totalReviews: Math.max(0, Math.round(toNum(row.totalReviews))),
    completedSales: Math.max(0, Math.round(toNum(row.completedSales))),
    completedPurchases: Math.max(0, Math.round(toNum(row.completedPurchases))),
    memberSince,
  };
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

  async getSellerReviews(
    userId: string,
    params?: PaginationParams,
  ): Promise<SellerReviewPage> {
    const res = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_USERS.REVIEWS(userId),
      {
        params: buildPaginationQuery(params),
      },
    );
    return mapSellerReviewPage(res);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    try {
      const res = await this.http.get<unknown>(
        API_ENDPOINTS.CLIENT_USERS.PUBLIC_PROFILE(userId),
      );
      return mapPublicUserProfile(res);
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
