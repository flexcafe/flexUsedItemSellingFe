import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";

export function formatChatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}

export function messagePreview(
  message: ChatMessage | null | undefined,
): string {
  if (!message) return "";
  if (message.type === "TEXT") {
    return message.content?.trim() || "";
  }
  if (message.type === "DIRECT_TRADE_REQUEST") {
    const meta = message.metadata;
    const date =
      meta && typeof meta.meetingDate === "string"
        ? (meta.meetingDate as string)
        : "";
    const time =
      meta && typeof meta.meetingTime === "string"
        ? (meta.meetingTime as string)
        : "";
    if (date && time) return `${date} ${time}`;
    return date || time || "직거래 요청";
  }
  return message.content?.trim() || message.type.replaceAll("_", " ");
}

/** True when the room has at least one real message on the server. */
export function roomHasRealMessage(room: ChatRoom): boolean {
  const message = room.lastMessage;
  if (!message?.id || message.id.startsWith("preview-")) return false;
  if (message.type !== "TEXT") return true;
  return Boolean(message.content?.trim());
}

/** Seller: no badge until the buyer sends the first message. */
export function displayUnreadCount(
  room: ChatRoom,
  currentUserId: string | null | undefined,
): number {
  if (currentUserId === room.sellerId && !roomHasRealMessage(room)) {
    return 0;
  }
  return Math.max(0, room.unreadCount);
}

export function filterInboxRooms(
  rooms: ChatRoom[],
  currentUserId: string | null | undefined,
): ChatRoom[] {
  if (!currentUserId) return rooms;
  return rooms.filter((room) => {
    if (room.sellerId !== currentUserId) return true;
    return roomHasRealMessage(room);
  });
}

export function sortInboxRooms(rooms: ChatRoom[]): ChatRoom[] {
  const withMessage: ChatRoom[] = [];
  const withoutMessage: ChatRoom[] = [];
  for (const room of rooms) {
    if (roomHasRealMessage(room)) withMessage.push(room);
    else withoutMessage.push(room);
  }
  const byUpdatedDesc = (a: ChatRoom, b: ChatRoom) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return [
    ...withMessage.sort(byUpdatedDesc),
    ...withoutMessage.sort(byUpdatedDesc),
  ];
}

export function inboxPreviewText(
  room: ChatRoom,
  noMessagesLabel: string,
  tapToStartLabel: string,
): string {
  if (!roomHasRealMessage(room)) return tapToStartLabel;
  const preview = messagePreview(room.lastMessage);
  return preview || noMessagesLabel;
}

/** Latest location system message wins (messages oldest → newest). */
export function isLocationSharingActive(messages: ChatMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const type = messages[i]?.type;
    if (type === "LOCATION_SHARING_STARTED") return true;
    if (type === "LOCATION_SHARING_STOPPED") return false;
  }
  return false;
}

export type LiveLocationPoint = {
  userId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

function toFinite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readLatLng(metadata: Record<string, unknown> | null): {
  latitude: number;
  longitude: number;
} | null {
  if (!metadata) return null;
  const latitude =
    toFinite(metadata.latitude) ??
    toFinite(metadata.lat) ??
    toFinite(metadata.meetingLatitude);
  const longitude =
    toFinite(metadata.longitude) ??
    toFinite(metadata.lng) ??
    toFinite(metadata.lon) ??
    toFinite(metadata.meetingLongitude);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function readActorUserId(message: ChatMessage): string | null {
  if (message.senderId) return message.senderId;
  const meta = message.metadata;
  if (!meta) return null;
  const raw = meta.userId ?? meta.sharedByUserId ?? meta.senderId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function locationSharingByUser(
  messages: ChatMessage[],
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const msg of messages) {
    const actorUserId = readActorUserId(msg);
    if (!actorUserId) continue;
    if (msg.type === "LOCATION_SHARING_STARTED") state[actorUserId] = true;
    if (msg.type === "LOCATION_SHARING_STOPPED") state[actorUserId] = false;
  }
  return state;
}

export function locationPointsFromMessages(
  messages: ChatMessage[],
): Record<string, LiveLocationPoint> {
  const out: Record<string, LiveLocationPoint> = {};
  for (const msg of messages) {
    const actorUserId = readActorUserId(msg);
    if (!actorUserId) continue;
    const latLng = readLatLng(msg.metadata);
    if (!latLng) continue;
    out[actorUserId] = {
      userId: actorUserId,
      latitude: latLng.latitude,
      longitude: latLng.longitude,
      updatedAt: msg.createdAt,
    };
  }
  return out;
}

export function chatActionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (
      data &&
      typeof data === "object" &&
      data !== null &&
      "message" in data
    ) {
      const message = (data as { message: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (!/^Request failed with status/i.test(msg)) return msg;
  }
  return fallback;
}

export function roomListingTitle(
  room: ChatRoom,
  fallbackListingLabel: string,
): string {
  return room.listingTitle?.trim() || fallbackListingLabel;
}

export function formatRoomListingPrice(
  price: number | null | undefined,
): string | null {
  if (price == null || !Number.isFinite(price)) return null;
  return `${price.toLocaleString()} MMK`;
}

export function roomPeerLabel(
  room: ChatRoom,
  currentUserId: string | null | undefined,
  sellerFallback: string,
  buyerFallback: string,
): string {
  if (room.counterpartNickname?.trim()) return room.counterpartNickname.trim();
  if (!currentUserId) return buyerFallback;
  return currentUserId === room.buyerId ? sellerFallback : buyerFallback;
}
