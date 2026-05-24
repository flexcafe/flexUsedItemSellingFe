import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type { IChatRepository } from "@/core/domain/repositories/IChatRepository";
import type { IChatService } from "@/core/domain/services/IChatService";
import type {
  AcceptLocationInput,
  CursorPage,
  CursorPaginationParams,
  DirectTradeDetail,
  DirectTradeRequestInput,
  DirectTradeTransaction,
  LocationShareInput,
  LocationShareStartResult,
  OpenChatRoomInput,
  RequestLocationChangeInput,
  RespondLocationChangeInput,
  SafePaymentStatus,
  SafePaymentSubmitInput,
  SendChatMessageInput,
  TransactionCompleteInput,
  TransactionReview,
  TransactionReviewInput,
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

  sendMessage(
    chatRoomId: string,
    input: SendChatMessageInput,
  ): Promise<ChatMessage> {
    return this.repo.sendMessage(chatRoomId, input);
  }

  markRead(chatRoomId: string): Promise<number> {
    return this.repo.markRead(chatRoomId);
  }

  requestDirectTrade(
    chatRoomId: string,
    input: DirectTradeRequestInput,
  ): Promise<DirectTradeTransaction> {
    return this.repo.requestDirectTrade(chatRoomId, input);
  }

  getDirectTradeDetail(chatRoomId: string): Promise<DirectTradeDetail> {
    return this.repo.getDirectTradeDetail(chatRoomId);
  }

  acceptLocation(
    chatRoomId: string,
    input: AcceptLocationInput,
  ): Promise<boolean> {
    return this.repo.acceptLocation(chatRoomId, input);
  }

  requestLocationChange(
    chatRoomId: string,
    input: RequestLocationChangeInput,
  ): Promise<boolean> {
    return this.repo.requestLocationChange(chatRoomId, input);
  }

  respondLocationChange(
    chatRoomId: string,
    input: RespondLocationChangeInput,
  ): Promise<boolean> {
    return this.repo.respondLocationChange(chatRoomId, input);
  }

  startLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<LocationShareStartResult> {
    return this.repo.startLocationShare(chatRoomId, input);
  }

  updateLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<boolean> {
    return this.repo.updateLocationShare(chatRoomId, input);
  }

  stopLocationShare(chatRoomId: string): Promise<boolean> {
    return this.repo.stopLocationShare(chatRoomId);
  }

  requestSafePayment(chatRoomId: string): Promise<DirectTradeTransaction> {
    return this.repo.requestSafePayment(chatRoomId);
  }

  getSafePaymentStatus(chatRoomId: string): Promise<SafePaymentStatus> {
    return this.repo.getSafePaymentStatus(chatRoomId);
  }

  submitSafePayment(
    chatRoomId: string,
    input: SafePaymentSubmitInput,
  ): Promise<DirectTradeTransaction> {
    return this.repo.submitSafePayment(chatRoomId, input);
  }

  completeTransaction(
    input: TransactionCompleteInput,
  ): Promise<DirectTradeTransaction> {
    return this.repo.completeTransaction(input);
  }

  submitTransactionReview(
    transactionId: string,
    input: TransactionReviewInput,
  ): Promise<TransactionReview> {
    return this.repo.submitTransactionReview(transactionId, input);
  }
}
