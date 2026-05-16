import { PublicProductDetailScreen } from "@/features/products/presentation/PublicProductDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function PublicProductDetailPage() {
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const raw = params.productId;
  const productId = Array.isArray(raw) ? raw[0] : raw;

  if (!productId) return null;
  return <PublicProductDetailScreen productId={productId} />;
}
