export interface CategoryDto {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  icon?: unknown;
  sortOrder?: number | null;
  isActive?: boolean | null;
  parentId?: unknown;
  children?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
}
