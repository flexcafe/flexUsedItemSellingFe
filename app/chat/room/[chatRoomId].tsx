import { ChatRoomScreen } from "@/features/chat/presentation/ChatRoomScreen";
import { useLocalSearchParams } from "expo-router";

export default function ChatRoomPage() {
  const params = useLocalSearchParams<{
    chatRoomId?: string | string[];
    listingId?: string | string[];
    sellerId?: string | string[];
    listingTitle?: string | string[];
    peerName?: string | string[];
  }>();
  const read = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? "";
  const chatRoomId = read(params.chatRoomId);
  if (!chatRoomId) return null;

  return (
    <ChatRoomScreen
      chatRoomId={chatRoomId}
      listingId={read(params.listingId) || undefined}
      sellerId={read(params.sellerId) || undefined}
      listingTitle={read(params.listingTitle) || undefined}
      peerName={read(params.peerName) || undefined}
    />
  );
}
