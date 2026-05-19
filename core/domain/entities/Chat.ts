export type ChatMessageType =
  | "TEXT"
  | "DIRECT_TRADE_REQUEST"
  | "LOCATION_SHARING_STARTED"
  | "LOCATION_SHARING_STOPPED"
  | "SAFE_PAYMENT_REQUESTED"
  | "SAFE_PAYMENT_INSTRUCTION_SENT"
  | "SAFE_PAYMENT_INITIATED"
  | "SAFE_PAYMENT_VERIFIED"
  | "PAYMENT_TRANSFERRED"
  | "TRANSACTION_COMPLETED"
  | (string & {});

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string | null;
  type: ChatMessageType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  listingTitle?: string | null;
  listingImageUrl?: string | null;
  counterpartNickname?: string | null;
  counterpartUserId?: string | null;
}
