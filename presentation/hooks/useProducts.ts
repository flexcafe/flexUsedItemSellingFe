import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/core/domain/types";
import type {
  ProductCreateInput,
  ProductUpdateInput,
} from "@/core/domain/types/product";
import { useServices } from "../providers/ServicesProvider";

const PRODUCTS_KEY = ["products"];

export function useProducts(params?: PaginationParams) {
  const { productService } = useServices();
  return useQuery({
    queryKey: [...PRODUCTS_KEY, params?.page, params?.limit],
    queryFn: () => productService.getAll(params),
  });
}

export function useProduct(id: string | null) {
  const { productService } = useServices();
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => productService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: (data: ProductCreateInput) => productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdateInput }) =>
      productService.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: [...PRODUCTS_KEY, variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { productService } = useServices();
  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}
