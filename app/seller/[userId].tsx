import { PublicSellerProfileScreen } from "@/features/products/presentation/PublicSellerProfileScreen";
import { useLocalSearchParams } from "expo-router";

export default function PublicSellerPage() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const rawUserId = params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  if (!userId) return null;

  return <PublicSellerProfileScreen userId={userId} />;
}
