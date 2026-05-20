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
  return message.content?.trim() || message.type.replaceAll("_", " ");
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

export function formatRoomListingPrice(price: number | null | undefined): string | null {
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
