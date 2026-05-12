import { useQuery } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_CATEGORIES_QUERY_KEY = ["client", "categories"] as const;

export function useCategories() {
  const { categoryService } = useServices();
  return useQuery({
    queryKey: CLIENT_CATEGORIES_QUERY_KEY,
    queryFn: () => categoryService.listActiveTree(),
    staleTime: 60_000,
    retry: false,
  });
}
