export interface ProductDto {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
}
