import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type {
  AcceptLocationInput,
  CursorPage,
  CursorPaginationParams,
  DirectTradeDetail,
  DirectTradeRequestInput,
  DirectTradeTransaction,
  ListingLocation,
  LocationShareInput,
  LocationShareStartResult,
  OpenChatRoomInput,
  RequestLocationChangeInput,
  RespondLocationChangeInput,
  SafePaymentStatus,
  SafePaymentSubmitInput,
  SendChatMessageInput,
  TransactionCancelInput,
  TransactionCompleteInput,
  TransactionReview,
  TransactionReviewInput,
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
  getDirectTradeDetail(
    chatRoomId: string,
  ): Promise<DirectTradeDetail>;
  acceptLocation(
    chatRoomId: string,
    input: AcceptLocationInput,
  ): Promise<boolean>;
  requestLocationChange(
    chatRoomId: string,
    input: RequestLocationChangeInput,
  ): Promise<boolean>;
  respondLocationChange(
    chatRoomId: string,
    input: RespondLocationChangeInput,
  ): Promise<boolean>;
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
  completeTransaction(
    input: TransactionCompleteInput,
  ): Promise<DirectTradeTransaction>;
  cancelTransaction(
    input: TransactionCancelInput,
  ): Promise<DirectTradeTransaction>;
  submitTransactionReview(
    transactionId: string,
    input: TransactionReviewInput,
  ): Promise<TransactionReview>;
}
