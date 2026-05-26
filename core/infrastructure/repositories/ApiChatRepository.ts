import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type { IChatRepository } from "@/core/domain/repositories/IChatRepository";
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
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return null;
  return value as UnknownRecord;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** `ChatMessageResponseDto` from GET/POST messages. */
function mapMessage(value: unknown): ChatMessage | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = toNonEmptyString(row.id);
  const chatRoomId = toNonEmptyString(row.chatRoomId);
  const createdAt = toNonEmptyString(row.createdAt);
  if (!id || !chatRoomId || !createdAt) return null;

  const senderId = toNonEmptyString(row.senderId);
  const type = toNonEmptyString(row.type) ?? "TEXT";
  const content = typeof row.content === "string" ? row.content : null;
  const metadata = asRecord(row.metadata);

  return {
    id,
    chatRoomId,
    senderId,
    content,
    type,
    metadata,
    isRead: toBoolean(row.isRead),
    createdAt,
  };
}

function readListingFields(row: UnknownRecord): {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
} {
  const nested = asRecord(row.listing);
  if (nested) {
    const price = Number(nested.price);
    return {
      title: toNonEmptyString(nested.title),
      imageUrl: toNonEmptyString(nested.imageUrl),
      price: Number.isFinite(price) ? price : null,
    };
  }
  const flatPrice = Number(row.listingPrice ?? row.price);
  return {
    title: toNonEmptyString(
      row.listingTitle ?? row.listingName ?? row.productTitle,
    ),
    imageUrl: toNonEmptyString(
      row.listingImageUrl ?? row.listingImage ?? row.productImageUrl,
    ),
    price: Number.isFinite(flatPrice) ? flatPrice : null,
  };
}

function readCounterpartyFields(row: UnknownRecord): {
  userId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
} {
  const nested = asRecord(row.counterparty);
  if (nested) {
    return {
      userId: toNonEmptyString(nested.userId),
      displayName: toNonEmptyString(nested.displayName),
      avatarUrl: toNonEmptyString(nested.avatarUrl),
    };
  }
  return {
    userId: toNonEmptyString(
      row.counterpartUserId ?? row.peerUserId ?? row.otherPartyUserId,
    ),
    displayName: toNonEmptyString(
      row.counterpartNickname ?? row.peerNickname ?? row.otherPartyNickname,
    ),
    avatarUrl: toNonEmptyString(
      row.counterpartAvatarUrl ?? row.peerAvatarUrl ?? row.otherPartyAvatarUrl,
    ),
  };
}

function buildChatRoom(row: UnknownRecord): ChatRoom | null {
  const id = toNonEmptyString(row.chatRoomId ?? row.id);
  const listingId = toNonEmptyString(row.listingId);
  const buyerId = toNonEmptyString(row.buyerId);
  const sellerId = toNonEmptyString(row.sellerId);
  const updatedAt = toNonEmptyString(row.updatedAt);

  if (!id || !listingId || !buyerId || !sellerId || !updatedAt) {
    return null;
  }

  const listing = readListingFields(row);
  const counterparty = readCounterpartyFields(row);
  const createdAt = toNonEmptyString(row.createdAt) ?? updatedAt;

  return {
    id,
    listingId,
    buyerId,
    sellerId,
    isActive: toBoolean(row.isActive, true),
    createdAt,
    updatedAt,
    lastMessage:
      mapMessage(row.lastMessage) ?? mapLastMessageFromSummary(row, id),
    unreadCount: Math.max(0, Math.round(toFiniteNumber(row.unreadCount, 0))),
    listingTitle: listing.title,
    listingImageUrl: listing.imageUrl,
    listingPrice: listing.price,
    counterpartNickname: counterparty.displayName,
    counterpartUserId: counterparty.userId,
    counterpartAvatarUrl: counterparty.avatarUrl,
  };
}

/** Build preview message from `ChatRoomSummaryResponseDto` flat latest* fields. */
function mapLastMessageFromSummary(
  row: UnknownRecord,
  chatRoomId: string,
): ChatMessage | null {
  const messageId = toNonEmptyString(row.latestMessageId);
  const type = toNonEmptyString(row.latestMessageType);
  const content =
    typeof row.latestMessageContent === "string"
      ? row.latestMessageContent
      : null;
  const createdAt =
    toNonEmptyString(row.latestMessageCreatedAt) ??
    toNonEmptyString(row.updatedAt);

  if (!messageId) return null;

  return {
    id: messageId,
    chatRoomId,
    senderId: null,
    type: type ?? "TEXT",
    content,
    metadata: null,
    isRead: true,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

/** `ChatRoomSummaryResponseDto` from GET /client/chats/rooms. */
function mapRoomSummary(value: unknown): ChatRoom | null {
  const row = asRecord(value);
  if (!row) return null;
  return buildChatRoom(row);
}

/** Full room from POST /client/chats/rooms (`id`, `createdAt`, …). */
function mapRoomDetail(value: unknown): ChatRoom | null {
  const row = asRecord(value);
  if (!row) return null;
  const room = buildChatRoom(row);
  if (!room) return null;
  const createdAt = toNonEmptyString(row.createdAt);
  return {
    ...room,
    ...(createdAt ? { createdAt } : {}),
    isActive: toBoolean(row.isActive, room.isActive),
  };
}

function mapCursorPage<T>(
  value: unknown,
  mapItem: (item: unknown) => T | null,
): CursorPage<T> {
  const empty: CursorPage<T> = { items: [], nextCursor: null };

  if (Array.isArray(value)) {
    const items = value
      .map((item) => mapItem(item))
      .filter((item): item is T => item != null);
    return { items, nextCursor: null };
  }

  const row = asRecord(value);
  if (!row) return empty;

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items: T[] = rawItems
    .map((item) => mapItem(item))
    .filter((item): item is T => item != null);

  return {
    items,
    nextCursor: toNonEmptyString(row.nextCursor),
  };
}

function buildCursorQuery(
  params?: CursorPaginationParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  const cursor = params?.cursor?.trim();
  if (cursor) query.cursor = cursor;
  const take = params?.take;
  if (typeof take === "number" && Number.isFinite(take)) {
    query.take = Math.min(50, Math.max(1, Math.round(take)));
  }
  return query;
}

function readMarkedCount(value: unknown): number {
  const row = asRecord(value);
  if (!row) return 0;
  const fromKnown =
    row.markedCount ??
    row.updatedCount ??
    row.count ??
    row.readCount ??
    row.messagesMarkedRead;
  return Math.max(0, Math.round(toFiniteNumber(fromKnown, 0)));
}

function mapDirectTradeTransaction(
  value: unknown,
): DirectTradeTransaction | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = toNonEmptyString(row.id);
  const chatRoomId = toNonEmptyString(row.chatRoomId);
  const type = toNonEmptyString(row.type);
  const status = toNonEmptyString(row.status);
  if (!id || !chatRoomId || !type || !status) return null;
  const completedAt = toNonEmptyString(row.completedAt);
  return {
    id,
    chatRoomId,
    type,
    status,
    amount: toFiniteNumber(row.amount, 0),
    buyerCompleted: toBoolean(row.buyerCompleted),
    sellerCompleted: toBoolean(row.sellerCompleted),
    completedAt,
  };
}

function mapListingLocation(value: unknown): ListingLocation | null {
  const row = asRecord(value);
  if (!row) return null;
  const label = toNonEmptyString(row.label);
  const address = toNonEmptyString(row.address);
  if (!label || !address) return null;
  return {
    label,
    address,
    latitude: toFiniteNumber(row.latitude, 0),
    longitude: toFiniteNumber(row.longitude, 0),
  };
}

function mapDirectTradeDetail(value: unknown): DirectTradeDetail | null {
  const row = asRecord(value);
  if (!row) return null;
  const transactionId = toNonEmptyString(row.transactionId ?? row.id);
  if (!transactionId) return null;
  const rawListingLocations = Array.isArray(row.listingLocations)
    ? row.listingLocations
    : [];
  const listingLocations: ListingLocation[] = rawListingLocations
    .map(mapListingLocation)
    .filter((loc): loc is ListingLocation => loc != null);
  return {
    transactionId,
    meetingDate: toNonEmptyString(row.meetingDate),
    meetingTime: toNonEmptyString(row.meetingTime),
    meetingLocation: toNonEmptyString(row.meetingLocation),
    meetingLatitude: Number.isFinite(Number(row.meetingLatitude))
      ? Number(row.meetingLatitude)
      : null,
    meetingLongitude: Number.isFinite(Number(row.meetingLongitude))
      ? Number(row.meetingLongitude)
      : null,
    selectedLocationLabel: toNonEmptyString(row.selectedLocationLabel),
    pendingLocationChange: toBoolean(
      row.pendingLocationChange ??
        row.isPendingLocationChange ??
        row.hasPendingLocationChange,
    ),
    buyerRequestedLocation: toNonEmptyString(
      row.buyerRequestedLocation ??
        row.requestedMeetingLocation ??
        row.pendingMeetingLocation,
    ),
    buyerRequestedLatitude: Number.isFinite(Number(row.buyerRequestedLatitude))
      ? Number(row.buyerRequestedLatitude)
      : null,
    buyerRequestedLongitude: Number.isFinite(Number(row.buyerRequestedLongitude))
      ? Number(row.buyerRequestedLongitude)
      : null,
    listingLocations,
  };
}

function readLocationStart(value: unknown): LocationShareStartResult {
  const row = asRecord(value);
  if (!row) return { alreadyActive: false };
  return { alreadyActive: toBoolean(row.alreadyActive, false) };
}

function readBooleanPayload(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const row = asRecord(value);
  if (!row) return false;
  const fromKnown = row.success ?? row.ok ?? row.result ?? row.data;
  return toBoolean(fromKnown, false);
}

function mapSafePaymentStatus(value: unknown): SafePaymentStatus | null {
  const row = asRecord(value);
  if (!row) return null;
  const transaction = mapDirectTradeTransaction(row.transaction);
  if (!transaction) return null;
  const paymentAmountRaw = row.paymentAmount;
  const paymentAmount =
    paymentAmountRaw == null ? null : toFiniteNumber(paymentAmountRaw, 0);
  const verifiedRaw = row.buyerKbzIsVerified;
  return {
    transaction,
    adminReceivingPhone: toNonEmptyString(row.adminReceivingPhone),
    instructionSentAt: toNonEmptyString(row.instructionSentAt),
    instructionNote: toNonEmptyString(row.instructionNote),
    canSubmitPayment: toBoolean(row.canSubmitPayment),
    payerKbzName: toNonEmptyString(row.payerKbzName),
    payerKbzPhone: toNonEmptyString(row.payerKbzPhone),
    paymentAmount,
    kbzTransactionId: toNonEmptyString(row.kbzTransactionId),
    buyerKbzAccountName: toNonEmptyString(row.buyerKbzAccountName),
    buyerKbzPhoneNumber: toNonEmptyString(row.buyerKbzPhoneNumber),
    buyerKbzIsVerified:
      typeof verifiedRaw === "boolean"
        ? verifiedRaw
        : verifiedRaw == null
          ? null
          : toBoolean(verifiedRaw),
  };
}

function mapTransactionReview(value: unknown): TransactionReview | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = toNonEmptyString(row.id);
  const transactionId = toNonEmptyString(row.transactionId);
  const reviewerId = toNonEmptyString(row.reviewerId);
  const revieweeId = toNonEmptyString(row.revieweeId);
  const createdAt = toNonEmptyString(row.createdAt);
  if (!id || !transactionId || !reviewerId || !revieweeId || !createdAt) {
    return null;
  }
  const rawComment = row.comment;
  const comment =
    typeof rawComment === "string" ? rawComment : toNonEmptyString(rawComment);
  return {
    id,
    transactionId,
    reviewerId,
    revieweeId,
    stars: Math.min(5, Math.max(1, Math.round(toFiniteNumber(row.stars, 0)))),
    comment,
    pointsAwarded: toFiniteNumber(row.pointsAwarded, 0),
    createdAt,
  };
}

export class ApiChatRepository implements IChatRepository {
  constructor(private readonly http: HttpClient) {}

  async openRoom(input: OpenChatRoomInput): Promise<ChatRoom> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.ROOMS,
      {
        listingId: input.listingId,
        sellerId: input.sellerId,
      },
    );
    const room = mapRoomDetail(data);
    if (!room) throw new Error("Open chat room response is invalid");
    return room;
  }

  async listRooms(
    params?: CursorPaginationParams,
  ): Promise<CursorPage<ChatRoom>> {
    const data = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.ROOMS,
      {
        params: buildCursorQuery(params),
      },
    );
    return mapCursorPage(data, mapRoomSummary);
  }

  async listMessages(
    chatRoomId: string,
    params?: CursorPaginationParams,
  ): Promise<CursorPage<ChatMessage>> {
    const data = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.MESSAGES(chatRoomId),
      {
        params: buildCursorQuery(params),
      },
    );
    return mapCursorPage(data, mapMessage);
  }

  async sendMessage(
    chatRoomId: string,
    input: SendChatMessageInput,
  ): Promise<ChatMessage> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.MESSAGES(chatRoomId),
      {
        content: input.content,
        type: input.type ?? "TEXT",
        idempotencyKey: input.idempotencyKey,
      },
    );
    const message = mapMessage(data);
    if (!message) throw new Error("Send message response is invalid");
    return message;
  }

  async markRead(chatRoomId: string): Promise<number> {
    const data = await this.http.patch<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.MARK_READ(chatRoomId),
      {},
    );
    return readMarkedCount(data);
  }

  async requestDirectTrade(
    chatRoomId: string,
    input: DirectTradeRequestInput,
  ): Promise<DirectTradeTransaction> {
    const body: Record<string, unknown> = {
      meetingDate: input.meetingDate,
      meetingTime: input.meetingTime,
    };
    const location = input.meetingLocation?.trim();
    if (location) body.meetingLocation = location;
    if (
      typeof input.meetingLatitude === "number" &&
      Number.isFinite(input.meetingLatitude) &&
      typeof input.meetingLongitude === "number" &&
      Number.isFinite(input.meetingLongitude)
    ) {
      body.meetingLatitude = input.meetingLatitude;
      body.meetingLongitude = input.meetingLongitude;
    }

    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.DIRECT_TRADE(chatRoomId),
      body,
    );
    const trade = mapDirectTradeTransaction(data);
    if (!trade) throw new Error("Direct trade response is invalid");
    return trade;
  }

  async getDirectTradeDetail(
    chatRoomId: string,
  ): Promise<DirectTradeDetail> {
    const data = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.DIRECT_TRADE(chatRoomId),
    );
    const detail = mapDirectTradeDetail(data);
    if (!detail) throw new Error("Direct trade detail response is invalid");
    return detail;
  }

  async acceptLocation(
    chatRoomId: string,
    input: AcceptLocationInput,
  ): Promise<boolean> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.DIRECT_TRADE_ACCEPT_LOCATION(chatRoomId),
      { locationLabel: input.locationLabel },
    );
    return readBooleanPayload(data);
  }

  async requestLocationChange(
    chatRoomId: string,
    input: RequestLocationChangeInput,
  ): Promise<boolean> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.DIRECT_TRADE_REQUEST_CHANGE(chatRoomId),
      {
        meetingTime: input.meetingTime,
        meetingLocation: input.meetingLocation,
        meetingLatitude: input.meetingLatitude,
        meetingLongitude: input.meetingLongitude,
      },
    );
    return readBooleanPayload(data);
  }

  async respondLocationChange(
    chatRoomId: string,
    input: RespondLocationChangeInput,
  ): Promise<boolean> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.DIRECT_TRADE_RESPOND_CHANGE(chatRoomId),
      { accepted: input.accepted },
    );
    return readBooleanPayload(data);
  }

  async startLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<LocationShareStartResult> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.LOCATION_START(chatRoomId),
      {
        latitude: input.latitude,
        longitude: input.longitude,
        expiresInSeconds: input.expiresInSeconds,
      },
    );
    return readLocationStart(data);
  }

  async updateLocationShare(
    chatRoomId: string,
    input: LocationShareInput,
  ): Promise<boolean> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.LOCATION_UPDATE(chatRoomId),
      {
        latitude: input.latitude,
        longitude: input.longitude,
        expiresInSeconds: input.expiresInSeconds,
      },
    );
    return readBooleanPayload(data);
  }

  async stopLocationShare(chatRoomId: string): Promise<boolean> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.LOCATION_STOP(chatRoomId),
      {},
    );
    return readBooleanPayload(data);
  }

  async requestSafePayment(
    chatRoomId: string,
  ): Promise<DirectTradeTransaction> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.SAFE_PAYMENT_REQUEST(chatRoomId),
      {},
    );
    const safePayment = mapDirectTradeTransaction(data);
    if (!safePayment)
      throw new Error("Safe payment request response is invalid");
    return safePayment;
  }

  async getSafePaymentStatus(chatRoomId: string): Promise<SafePaymentStatus> {
    const data = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.SAFE_PAYMENT_STATUS(chatRoomId),
    );
    const safePayment = mapSafePaymentStatus(data);
    if (!safePayment)
      throw new Error("Safe payment status response is invalid");
    return safePayment;
  }

  async submitSafePayment(
    chatRoomId: string,
    input: SafePaymentSubmitInput,
  ): Promise<DirectTradeTransaction> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.SAFE_PAYMENT_SUBMIT(chatRoomId),
      {
        payerKbzName: input.payerKbzName,
        payerKbzPhone: input.payerKbzPhone,
        paymentAmount: input.paymentAmount,
        kbzTransactionId: input.kbzTransactionId,
        idempotencyKey: input.idempotencyKey,
      },
    );
    const safePayment = mapDirectTradeTransaction(data);
    if (!safePayment)
      throw new Error("Safe payment submit response is invalid");
    return safePayment;
  }

  async completeTransaction(
    input: TransactionCompleteInput,
  ): Promise<DirectTradeTransaction> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.TRANSACTION_COMPLETE,
      {
        transactionId: input.transactionId,
      },
    );
    const transaction = mapDirectTradeTransaction(data);
    if (!transaction)
      throw new Error("Complete transaction response is invalid");
    return transaction;
  }

  async cancelTransaction(
    input: TransactionCancelInput,
  ): Promise<DirectTradeTransaction> {
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.TRANSACTION_CANCEL,
      {
        transactionId: input.transactionId,
      },
    );
    const transaction = mapDirectTradeTransaction(data);
    if (!transaction)
      throw new Error("Cancel transaction response is invalid");
    return transaction;
  }

  async submitTransactionReview(
    transactionId: string,
    input: TransactionReviewInput,
  ): Promise<TransactionReview> {
    const comment = input.comment?.trim();
    const body: Record<string, unknown> = {
      stars: input.stars,
    };
    if (comment) body.comment = comment;
    const data = await this.http.post<unknown>(
      API_ENDPOINTS.CLIENT_CHATS.TRANSACTION_REVIEWS(transactionId),
      body,
    );
    const review = mapTransactionReview(data);
    if (!review) throw new Error("Submit review response is invalid");
    return review;
  }
}
