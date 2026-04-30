export interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

