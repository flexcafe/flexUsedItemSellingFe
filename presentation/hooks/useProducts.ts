import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MyProductListParams,
  ProductDeleteInput,
  ProductCreateInput,
  ProductUpdateInput,
} from "@/core/domain/types/product";
import { CLIENT_PRODUCTS_QUERY_KEY } from "@/presentation/hooks/useClientProducts";
import { useServices } from "../providers/ServicesProvider";

const PRODUCTS_KEY = ["products"] as const;
const MY_PRODUCTS_KEY = [...PRODUCTS_KEY, "my"] as const;

export function useProducts(params?: MyProductListParams) {
  const { productService } = useServices();
  const limit = params?.limit ?? 20;
  const status = params?.status ?? null;
  return useInfiniteQuery({
    queryKey: [...MY_PRODUCTS_KEY, limit, status],
    initialPageParam: params?.page ?? 1,
    queryFn: ({ pageParam }) =>
      productService.getMyList({ page: pageParam as number, limit, status: params?.status }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
  });
}

export function useProduct(id: string | null) {
  const { productService } = useServices();
  return useQuery({
    queryKey: [...MY_PRODUCTS_KEY, "detail", id],
    queryFn: () => productService.getMyById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: (data: ProductCreateInput) => productService.createMy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: [...CLIENT_PRODUCTS_QUERY_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdateInput }) =>
      productService.updateMy(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: [...CLIENT_PRODUCTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [...MY_PRODUCTS_KEY, "detail", variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductDeleteInput }) =>
      productService.deleteMy(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: [...CLIENT_PRODUCTS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [...MY_PRODUCTS_KEY, "detail", variables.id] });
    },
  });
}
