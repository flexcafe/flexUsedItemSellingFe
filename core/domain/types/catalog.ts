/** Allowed `radiusKm` values for `GET /v1/client/products` (requires latitude + longitude). */
export const CLIENT_CATALOG_RADIUS_KM_OPTIONS = [2, 5, 10, 20] as const;

export type ClientCatalogRadiusKm =
  (typeof CLIENT_CATALOG_RADIUS_KM_OPTIONS)[number];

export type ClientCatalogRadiusSelection = ClientCatalogRadiusKm | null;

export function resolveCatalogRadiusIndex(
  radiusKm: ClientCatalogRadiusSelection,
): number {
  if (radiusKm == null) return 0;
  const idx = CLIENT_CATALOG_RADIUS_KM_OPTIONS.indexOf(radiusKm);
  return idx >= 0 ? idx + 1 : 0;
}

export function catalogRadiusFromIndex(
  index: number,
): ClientCatalogRadiusSelection {
  if (index <= 0) return null;
  return CLIENT_CATALOG_RADIUS_KM_OPTIONS[index - 1] ?? null;
}
