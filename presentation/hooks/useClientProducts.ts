import { useInfiniteQuery } from "@tanstack/react-query";
import type { ClientProductListParams } from "@/core/domain/types/product";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_PRODUCTS_QUERY_KEY = ["client", "products"] as const;

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
