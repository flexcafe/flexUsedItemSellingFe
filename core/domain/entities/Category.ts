export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  children: Category[];
}
