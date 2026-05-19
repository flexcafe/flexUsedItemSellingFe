import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type { IChatRepository } from "@/core/domain/repositories/IChatRepository";
import type {
  CursorPage,
  CursorPaginationParams,
  DirectTradeRequestInput,
  DirectTradeTransaction,
  LocationShareInput,
  LocationShareStartResult,
  OpenChatRoomInput,
  SendChatMessageInput,
} from "@/core/domain/types/chat";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
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

/** Build preview message from `ChatRoomSummaryResponseDto` flat latest* fields. */
function mapLastMessageFromSummary(
  row: UnknownRecord,
  chatRoomId: string,
): ChatMessage | null {
  const messageId = toNonEmptyString(row.latestMessageId);
  const type = toNonEmptyString(row.latestMessageType);
  const content =
    typeof row.latestMessageContent === "string" ? row.latestMessageContent : null;
  const createdAt =
    toNonEmptyString(row.latestMessageCreatedAt) ??
    toNonEmptyString(row.updatedAt);

  if (!messageId && !content && !type) return null;

  return {
    id: messageId ?? `preview-${chatRoomId}`,
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

  const id = toNonEmptyString(row.chatRoomId ?? row.id);
  const listingId = toNonEmptyString(row.listingId);
  const buyerId = toNonEmptyString(row.buyerId);
  const sellerId = toNonEmptyString(row.sellerId);
  const updatedAt = toNonEmptyString(row.updatedAt);

  if (!id || !listingId || !buyerId || !sellerId || !updatedAt) {
    return null;
  }

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
    listingTitle: toNonEmptyString(
      row.listingTitle ?? row.listingName ?? row.productTitle,
    ),
    listingImageUrl: toNonEmptyString(
      row.listingImageUrl ?? row.listingImage ?? row.productImageUrl,
    ),
    counterpartNickname: toNonEmptyString(
      row.counterpartNickname ?? row.peerNickname ?? row.otherPartyNickname,
    ),
    counterpartUserId: toNonEmptyString(
      row.counterpartUserId ?? row.peerUserId ?? row.otherPartyUserId,
    ),
  };
}

/** Full room from POST /client/chats/rooms (`id`, `createdAt`, …). */
function mapRoomDetail(value: unknown): ChatRoom | null {
  const summary = mapRoomSummary(value);
  if (summary) {
    const row = asRecord(value)!;
    const createdAt = toNonEmptyString(row.createdAt);
    if (createdAt) {
      return { ...summary, createdAt, isActive: toBoolean(row.isActive, summary.isActive) };
    }
    return summary;
  }

  const row = asRecord(value);
  if (!row) return null;

  const id = toNonEmptyString(row.id ?? row.chatRoomId);
  const listingId = toNonEmptyString(row.listingId);
  const buyerId = toNonEmptyString(row.buyerId);
  const sellerId = toNonEmptyString(row.sellerId);
  const createdAt = toNonEmptyString(row.createdAt);
  const updatedAt = toNonEmptyString(row.updatedAt);

  if (!id || !listingId || !buyerId || !sellerId || !createdAt || !updatedAt) {
    return null;
  }

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
    listingTitle: toNonEmptyString(
      row.listingTitle ?? row.listingName ?? row.productTitle,
    ),
    listingImageUrl: toNonEmptyString(
      row.listingImageUrl ?? row.listingImage ?? row.productImageUrl,
    ),
    counterpartNickname: toNonEmptyString(
      row.counterpartNickname ?? row.peerNickname ?? row.otherPartyNickname,
    ),
    counterpartUserId: toNonEmptyString(
      row.counterpartUserId ?? row.peerUserId ?? row.otherPartyUserId,
    ),
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

function mapDirectTradeTransaction(value: unknown): DirectTradeTransaction | null {
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

export class ApiChatRepository implements IChatRepository {
  constructor(private readonly http: HttpClient) {}

  async openRoom(input: OpenChatRoomInput): Promise<ChatRoom> {
    const data = await this.http.post<unknown>(API_ENDPOINTS.CLIENT_CHATS.ROOMS, {
      listingId: input.listingId,
      sellerId: input.sellerId,
    });
    const room = mapRoomDetail(data);
    if (!room) throw new Error("Open chat room response is invalid");
    return room;
  }

  async listRooms(params?: CursorPaginationParams): Promise<CursorPage<ChatRoom>> {
    const data = await this.http.get<unknown>(API_ENDPOINTS.CLIENT_CHATS.ROOMS, {
      params: buildCursorQuery(params),
    });
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
}
