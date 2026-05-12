/** GET /v1/client/slider-ads — `data` item shape (may omit fields). */
export interface SliderAdDto {
  id?: string;
  title?: string | null;
  imageUrl?: string | null;
  linkUrl?: unknown;
  status?: string | null;
  sortOrder?: number | null;
  startsAt?: unknown;
  endsAt?: unknown;
  createdById?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
