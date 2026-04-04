import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import container from "@/core/infrastructure/di/container";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { ProductDto } from "@/core/application/dtos/ProductDto";
import type { PaginationParams } from "@/core/domain/types";

const PRODUCTS_KEY = ["products"];

export function useProducts(params?: PaginationParams) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, params?.page, params?.limit],
    queryFn: () => {
      const service = container.resolve<IProductService>("productService");
      return service.getAll(params);
    },
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => {
      const service = container.resolve<IProductService>("productService");
      return service.getById(id!);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ProductDto, "id">) => {
      const service = container.resolve<IProductService>("productService");
      return service.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductDto> }) => {
      const service = container.resolve<IProductService>("productService");
      return service.update(id, data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      qc.invalidateQueries({ queryKey: [...PRODUCTS_KEY, variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const service = container.resolve<IProductService>("productService");
      return service.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}
