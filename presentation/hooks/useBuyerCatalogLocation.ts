import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";

export const BUYER_CATALOG_LOCATION_QUERY_KEY = ["client", "catalog-location"] as const;

/**
 * Foreground GPS for `GET /v1/client/products` nearest-first ordering.
 * Returns `null` when permission denied or position unavailable — catalog still loads without lat/lng.
 */
export function useBuyerCatalogLocation() {
  return useQuery({
    queryKey: BUYER_CATALOG_LOCATION_QUERY_KEY,
    queryFn: async (): Promise<{ latitude: number; longitude: number } | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
