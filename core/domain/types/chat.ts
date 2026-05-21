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

export interface DirectTradeRequestInput {
  meetingDate: string;
  meetingTime: string;
  meetingLocation?: string;
  meetingLatitude?: number;
  meetingLongitude?: number;
}

export interface DirectTradeTransaction {
  id: string;
  chatRoomId: string;
  type: string;
  status: string;
  amount: number;
  buyerCompleted: boolean;
  sellerCompleted: boolean;
  completedAt: string | null;
}

export interface LocationShareInput {
  latitude: number;
  longitude: number;
  expiresInSeconds?: number;
}

export interface LocationShareStartResult {
  alreadyActive: boolean;
}

export interface SafePaymentStatus {
  transaction: DirectTradeTransaction;
  adminReceivingPhone: string | null;
  instructionSentAt: string | null;
  instructionNote: string | null;
  canSubmitPayment: boolean;
  payerKbzName: string | null;
  payerKbzPhone: string | null;
  paymentAmount: number | null;
  kbzTransactionId: string | null;
  buyerKbzAccountName: string | null;
  buyerKbzPhoneNumber: string | null;
  buyerKbzIsVerified: boolean | null;
}

export interface SafePaymentSubmitInput {
  payerKbzName: string;
  payerKbzPhone: string;
  paymentAmount: number;
  kbzTransactionId: string;
  idempotencyKey?: string;
}
