import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { PaginationParams } from "@/core/domain/types";
import type { ClientProductListParams } from "@/core/domain/types/product";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_PRODUCTS_QUERY_KEY = ["client", "products"] as const;
export const CLIENT_PRODUCT_REVIEWS_QUERY_KEY = ["client", "seller-reviews"] as const;
export const CLIENT_PUBLIC_PROFILE_QUERY_KEY = ["client", "public-profile"] as const;

const DEFAULT_LIMIT = 20;

export type UseClientProductsCatalogParams = Omit<
  ClientProductListParams,
  "page"
>;

/**
 * Paginated public catalog (`GET /v1/client/products`) with optional geo for nearest-first ordering.
 */
export function useClientProductsCatalog(params?: UseClientProductsCatalogParams) {
  const { productService } = useServices();
  const limit = params?.limit ?? DEFAULT_LIMIT;

  return useInfiniteQuery({
    queryKey: [
      ...CLIENT_PRODUCTS_QUERY_KEY,
      "catalog",
      limit,
      params?.categoryId ?? null,
      params?.search ?? null,
      params?.latitude ?? null,
      params?.longitude ?? null,
      params?.radiusKm ?? null,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productService.getClientList({
        ...params,
        page: pageParam as number,
        limit,
      }),
    getNextPageParam: (last) =>
      last.hasNextPage ? last.page + 1 : undefined,
  });
}

/** Public product detail (`GET /v1/client/products/:productId`). */
export function useClientProductDetail(productId: string | null) {
  const { productService } = useServices();
  return useQuery({
    queryKey: [...CLIENT_PRODUCTS_QUERY_KEY, "detail", productId],
    queryFn: () => productService.getById(productId!),
    enabled: !!productId,
  });
}

/** Public seller reviews (`GET /v1/client/users/:userId/reviews`). */
export function useSellerReviews(
  sellerUserId: string | null,
  params?: PaginationParams,
) {
  const { productService } = useServices();
  const limit = params?.limit ?? 20;
  const page = params?.page ?? 1;
  return useQuery({
    queryKey: [...CLIENT_PRODUCT_REVIEWS_QUERY_KEY, sellerUserId, page, limit],
    queryFn: () =>
      productService.getSellerReviews(sellerUserId!, {
        page,
        limit,
      }),
    enabled: !!sellerUserId,
  });
}

/** Public user profile (`GET /v1/client/users/:userId/public-profile`). */
export function usePublicUserProfile(userId: string | null) {
  const { productService } = useServices();
  return useQuery({
    queryKey: [...CLIENT_PUBLIC_PROFILE_QUERY_KEY, userId],
    queryFn: () => productService.getPublicProfile(userId!),
    enabled: !!userId,
  });
}
