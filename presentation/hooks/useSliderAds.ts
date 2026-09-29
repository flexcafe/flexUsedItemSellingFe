import { useQuery } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_SLIDER_ADS_QUERY_KEY = ["client", "slider-ads"] as const;

export function useSliderAds() {
  const { sliderAdService } = useServices();
  return useQuery({
    queryKey: CLIENT_SLIDER_ADS_QUERY_KEY,
    queryFn: () => sliderAdService.listActive(),
    staleTime: 60_000,
    retry: false,
  });
}
