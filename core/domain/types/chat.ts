import type { ChatMessageType } from "@/core/domain/entities/Chat";

export interface CursorPaginationParams {
  cursor?: string | null;
  take?: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface OpenChatRoomInput {
  listingId: string;
  sellerId: string;
}

export interface SendChatMessageInput {
  content: string;
  type?: ChatMessageType;
  idempotencyKey?: string;
}
