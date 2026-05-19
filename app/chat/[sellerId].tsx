import { ChatRoomScreen } from "@/features/chat/presentation/ChatRoomScreen";
import { useLocalSearchParams } from "expo-router";

export default function ChatFromListingPage() {
  const params = useLocalSearchParams<{
    sellerId?: string | string[];
    sellerName?: string | string[];
    productId?: string | string[];
    productName?: string | string[];
  }>();
  const read = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? "";
  const sellerId = read(params.sellerId);
  if (!sellerId) return null;

  return (
    <ChatRoomScreen
      sellerId={sellerId}
      listingId={read(params.productId) || undefined}
      listingTitle={read(params.productName) || undefined}
      peerName={read(params.sellerName) || undefined}
    />
  );
}
