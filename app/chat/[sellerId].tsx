import { PublicChatPlaceholderScreen } from "../../features/products/presentation/PublicChatPlaceholderScreen";
import { useLocalSearchParams } from "expo-router";

export default function ChatPlaceholderPage() {
  const params = useLocalSearchParams<{
    sellerId?: string | string[];
    sellerName?: string | string[];
    productId?: string | string[];
    productName?: string | string[];
  }>();
  const read = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";
  const sellerId = read(params.sellerId);
  if (!sellerId) return null;

  return (
    <PublicChatPlaceholderScreen
      sellerId={sellerId}
      sellerName={read(params.sellerName)}
      productId={read(params.productId)}
      productName={read(params.productName)}
    />
  );
}
