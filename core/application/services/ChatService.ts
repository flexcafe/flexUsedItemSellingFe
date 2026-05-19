import type { IChatRepository } from "@/core/domain/repositories/IChatRepository";
import type { IChatService } from "@/core/domain/services/IChatService";
import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type {
  CursorPage,
  CursorPaginationParams,
  OpenChatRoomInput,
  SendChatMessageInput,
} from "@/core/domain/types/chat";

export class ChatService implements IChatService {
  constructor(private readonly repo: IChatRepository) {}

  openRoom(input: OpenChatRoomInput): Promise<ChatRoom> {
    return this.repo.openRoom(input);
  }

  listRooms(params?: CursorPaginationParams): Promise<CursorPage<ChatRoom>> {
    return this.repo.listRooms(params);
  }

  listMessages(
    chatRoomId: string,
    params?: CursorPaginationParams,
  ): Promise<CursorPage<ChatMessage>> {
    return this.repo.listMessages(chatRoomId, params);
  }

  sendMessage(chatRoomId: string, input: SendChatMessageInput): Promise<ChatMessage> {
    return this.repo.sendMessage(chatRoomId, input);
  }

  markRead(chatRoomId: string): Promise<number> {
    return this.repo.markRead(chatRoomId);
  }
}
