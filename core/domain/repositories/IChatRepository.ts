import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type {
  CursorPage,
  CursorPaginationParams,
  DirectTradeRequestInput,
  DirectTradeTransaction,
  LocationShareInput,
  LocationShareStartResult,
  OpenChatRoomInput,
  SafePaymentStatus,
  SafePaymentSubmitInput,
  SendChatMessageInput,
} from "@/core/domain/types/chat";

export interface IChatRepository {
  openRoom(input: OpenChatRoomInput): Promise<ChatRoom>;
  listRooms(params?: CursorPaginationParams): Promise<CursorPage<ChatRoom>>;
  listMessages(
    chatRoomId: string,
    params?: CursorPaginationParams,
  ): Promise<CursorPage<ChatMessage>>;
  sendMessage(
    chatRoomId: string,
    input: SendChatMessageInput,
  ): Promise<ChatMessage>;
  markRead(chatRoomId: string): Promise<number>;
  requestDirectTrade(
    chatRoomId: string,
    input: DirectTradeRequestInput,
  ): Promise<DirectTradeTransaction>;
  startLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<LocationShareStartResult>;
  updateLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<boolean>;
  stopLocationShare(chatRoomId: string): Promise<boolean>;
  requestSafePayment(chatRoomId: string): Promise<DirectTradeTransaction>;
  getSafePaymentStatus(chatRoomId: string): Promise<SafePaymentStatus>;
  submitSafePayment(
    chatRoomId: string,
    input: SafePaymentSubmitInput,
  ): Promise<DirectTradeTransaction>;
}
