import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type {
  CursorPage,
  CursorPaginationParams,
  OpenChatRoomInput,
  SendChatMessageInput,
} from "@/core/domain/types/chat";

export interface IChatRepository {
  openRoom(input: OpenChatRoomInput): Promise<ChatRoom>;
  listRooms(params?: CursorPaginationParams): Promise<CursorPage<ChatRoom>>;
  listMessages(
    chatRoomId: string,
    params?: CursorPaginationParams,
  ): Promise<CursorPage<ChatMessage>>;
  sendMessage(chatRoomId: string, input: SendChatMessageInput): Promise<ChatMessage>;
  markRead(chatRoomId: string): Promise<number>;
}
