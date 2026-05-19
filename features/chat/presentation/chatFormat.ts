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

export function messagePreview(message: ChatMessage | null | undefined): string {
  if (!message) return "";
  if (message.type === "TEXT") {
    return message.content?.trim() || "";
  }
  return message.content?.trim() || message.type.replaceAll("_", " ");
}

export function roomDisplayTitle(
  room: ChatRoom,
  currentUserId: string | null | undefined,
  fallbackListingLabel: string,
  fallbackPeerLabel: string,
): string {
  if (room.listingTitle?.trim()) return room.listingTitle.trim();
  if (room.counterpartNickname?.trim()) return room.counterpartNickname.trim();
  if (currentUserId && room.sellerId === currentUserId) {
    return `${fallbackListingLabel} · ${room.buyerId.slice(-6)}`;
  }
  return `${fallbackListingLabel} · ${fallbackPeerLabel}`;
}

export function roomPeerLabel(
  room: ChatRoom,
  currentUserId: string | null | undefined,
  sellerFallback: string,
  buyerFallback: string,
): string {
  if (room.counterpartNickname?.trim()) return room.counterpartNickname.trim();
  if (!currentUserId) return sellerFallback;
  return currentUserId === room.buyerId ? sellerFallback : buyerFallback;
}
