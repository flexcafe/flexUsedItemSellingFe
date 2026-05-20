import { ChatRoomScreen } from "@/features/chat/presentation/ChatRoomScreen";
import { useLocalSearchParams } from "expo-router";

export default function ChatRoomPage() {
  const params = useLocalSearchParams<{
    chatRoomId?: string | string[];
    listingTitle?: string | string[];
    listingImageUrl?: string | string[];
    peerName?: string | string[];
    peerUserId?: string | string[];
  }>();
  const read = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) ?? "";
  const chatRoomId = read(params.chatRoomId);
  if (!chatRoomId) return null;

  return (
    <ChatRoomScreen
      chatRoomId={chatRoomId}
      listingTitle={read(params.listingTitle) || undefined}
      listingImageUrl={read(params.listingImageUrl) || undefined}
      peerName={read(params.peerName) || undefined}
      peerUserId={read(params.peerUserId) || undefined}
    />
  );
}
