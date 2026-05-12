import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_SLIDER_ADS_QUERY_KEY = ["client", "slider-ads"] as const;

export function useSliderAds() {
  const { sliderAdService } = useServices();
  const { isAuthenticated, isLoading, user } = useAuth();
  return useQuery({
    queryKey: CLIENT_SLIDER_ADS_QUERY_KEY,
    queryFn: () => sliderAdService.listActive(),
    enabled: !isLoading && isAuthenticated && Boolean(user?.accessToken),
    staleTime: 60_000,
    retry: false,
  });
}
