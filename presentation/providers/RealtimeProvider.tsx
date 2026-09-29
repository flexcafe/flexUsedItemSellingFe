import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import { toClientNotification } from "@/core/application/mappers/NotificationMapper";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import { CLIENT_CHAT_QUERY_KEY } from "@/presentation/hooks/useClientChat";
import {
  CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
  CLIENT_NOTIFICATIONS_QUERY_KEY,
} from "@/presentation/hooks/useNotifications";
import { isChatNotification } from "@/presentation/i18n/notifications";
import { openChatLiveSocket } from "@/presentation/lib/chatLiveSocket";
import { openUserLiveChannel } from "@/presentation/lib/userLiveChannel";
import { showIncomingNotificationToast } from "@/presentation/notifications/show-incoming-notification-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useAuth } from "./AuthProvider";
import { useLegalTerms } from "./LegalTermsProvider";
import { useLocale } from "./LocaleProvider";
import { useServices } from "./ServicesProvider";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "";
const POLL_INTERVAL_MS = 5000;
/** Wait until home is on screen before opening the live socket. */
const LIVE_START_DELAY_MS = 800;

function unwrapMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function extractNotificationDto(
  rawData: unknown,
): ClientNotificationDto | null {
  // Some payloads are wrapped or double-encoded:
  // { notification }, { data: { notification } }, { data: "<json>" }, "<json>".
  let cur = unwrapMaybeJson(rawData);
  for (let i = 0; i < 5; i += 1) {
    if (cur == null) return null;
    cur = unwrapMaybeJson(cur);
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) break;
    const r = cur as Record<string, unknown>;
    const direct = r.notification ?? r.payload ?? null;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as ClientNotificationDto;
    }
    const nested = r.data ?? r.result ?? null;
    if (nested == null) break;
    cur = nested;
  }
  return cur && typeof cur === "object" && !Array.isArray(cur)
    ? (cur as ClientNotificationDto)
    : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readChatRoomId(payload: unknown): string | null {
  const row = readRecord(payload);
  if (!row) return null;
  if (typeof row.chatRoomId === "string" && row.chatRoomId) return row.chatRoomId;
  const message = readRecord(row.message);
  if (typeof message?.chatRoomId === "string" && message.chatRoomId) {
    return message.chatRoomId;
  }
  return null;
}

function readSenderId(payload: unknown): string | null {
  const row = readRecord(payload);
  if (!row) return null;
  if (typeof row.senderId === "string" && row.senderId) return row.senderId;
  const message = readRecord(row.message);
  if (typeof message?.senderId === "string" && message.senderId) {
    return message.senderId;
  }
  return null;
}

function readMessageId(payload: unknown): string | null {
  const row = readRecord(payload);
  if (!row) return null;
  if (typeof row.messageId === "string" && row.messageId) return row.messageId;
  if (typeof row.id === "string" && row.id) return row.id;
  const message = readRecord(row.message);
  if (typeof message?.id === "string" && message.id) return message.id;
  return null;
}

function parseNotificationPayload(rawData: unknown): ClientNotification | null {
  const dto = extractNotificationDto(rawData);
  if (!dto) return null;
  const notification = toClientNotification(dto);
  return notification.id ? notification : null;
}

export function RealtimeProvider({
  children,
  liveEnabled = true,
}: {
  children: ReactNode;
  /** False while the launch splash is covering the app. */
  liveEnabled?: boolean;
}) {
  const { isAuthenticated, user } = useAuth();
  const { statusReady, isCheckingStatus } = useLegalTerms();
  const { locale, tf, t } = useLocale();
  const { notificationService } = useServices();
  const qc = useQueryClient();

  /** Toast copy follows the current locale without reconnecting the socket. */
  const pathname = usePathname();
  const localeRef = useRef(locale);
  const tfRef = useRef(tf);
  const tRef = useRef(t);
  const pathnameRef = useRef(pathname);
  const userIdRef = useRef(user?.id);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const lastChatToastRef = useRef("");
  localeRef.current = locale;
  tfRef.current = tf;
  tRef.current = t;
  pathnameRef.current = pathname;
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user.accessToken) {
      seenIdsRef.current = new Set();
      bootstrappedRef.current = false;
    }
  }, [isAuthenticated, user?.accessToken, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user.accessToken) return;
    let active = true;

    const mergeSnapshot = (list: ClientNotification[]) => {
      const nextSeen = new Set<string>(seenIdsRef.current);
      const fresh: ClientNotification[] = [];
      for (const item of list) {
        if (!item.id) continue;
        if (!nextSeen.has(item.id)) fresh.push(item);
        nextSeen.add(item.id);
      }
      seenIdsRef.current = nextSeen;

      qc.setQueryData<ClientNotification[]>(
        [...CLIENT_NOTIFICATIONS_QUERY_KEY, CLIENT_NOTIFICATIONS_DEFAULT_LIMIT],
        list,
      );

      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
        return;
      }

      for (const item of fresh) {
        showIncomingNotificationToast(
          item,
          localeRef.current,
          tfRef.current,
          tRef.current("tabsNotifications"),
        );
      }

      if (fresh.length > 0) {
        void qc.invalidateQueries({
          queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY,
          refetchType: "active",
        });
      }
      if (fresh.some((item) => isChatNotification(item))) {
        void qc.invalidateQueries({ queryKey: CLIENT_CHAT_QUERY_KEY });
      }
    };

    const pollOnce = async () => {
      try {
        const list = await notificationService.list(
          CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
        );
        if (!active) return;
        mergeSnapshot(list);
      } catch {
        // Poll fallback is best-effort.
      }
    };

    void pollOnce();
    const id = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isAuthenticated, notificationService, qc, user?.accessToken, user?.id]);

  const accessTokenRef = useRef(user?.accessToken);
  accessTokenRef.current = user?.accessToken;

  useEffect(() => {
    if (!liveEnabled) return;
    if (!isAuthenticated || !user?.id || !accessTokenRef.current) return;
    if (!statusReady || isCheckingStatus) return;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;

    let channel: ReturnType<typeof openUserLiveChannel> | null = null;
    const token = accessTokenRef.current;
    const channelName = `private-user-${user.id}`;

    const startTimer = setTimeout(() => {
      if (!token) return;
      channel = openUserLiveChannel({
        key: PUSHER_KEY,
        cluster: PUSHER_CLUSTER,
        channelName,
        authEndpoint: `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PUSHER.AUTH}`,
        token,
        onEvent: (eventName, data) => {
          const looksLikeChat =
            eventName.toLowerCase().includes("chat") ||
            eventName.toLowerCase().includes("message");
          if (eventName !== "notification.created") {
            if (looksLikeChat) {
              void qc.invalidateQueries({ queryKey: CLIENT_CHAT_QUERY_KEY });
            }
            return;
          }
          const incoming = parseNotificationPayload(data);
          if (!incoming) {
            if (looksLikeChat) {
              void qc.invalidateQueries({ queryKey: CLIENT_CHAT_QUERY_KEY });
            }
            return;
          }
          const listKey = [
            ...CLIENT_NOTIFICATIONS_QUERY_KEY,
            CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
          ] as const;
          const existing = qc.getQueryData<ClientNotification[]>(listKey) ?? [];
          const isNew =
            !existing.some((item) => item.id === incoming.id) &&
            !seenIdsRef.current.has(incoming.id);
          seenIdsRef.current.add(incoming.id);
          qc.setQueriesData(
            { queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY },
            (prev: ClientNotification[] | undefined) => {
              const list = prev ?? [];
              if (list.some((item) => item.id === incoming.id)) return list;
              return [incoming, ...list];
            },
          );
          if (isNew || !bootstrappedRef.current) {
            showIncomingNotificationToast(
              incoming,
              localeRef.current,
              tfRef.current,
              tRef.current("tabsNotifications"),
            );
          }
          bootstrappedRef.current = true;
          if (isNew) {
            void qc.invalidateQueries({
              queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY,
              refetchType: "active",
            });
          }
          if (isChatNotification(incoming)) {
            void qc.invalidateQueries({ queryKey: CLIENT_CHAT_QUERY_KEY });
          }
        },
      });
    }, LIVE_START_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      channel?.close();
    };
  }, [
    isAuthenticated,
    isCheckingStatus,
    liveEnabled,
    qc,
    statusReady,
    user?.id,
  ]);

  useEffect(() => {
    if (!liveEnabled) return;
    if (!isAuthenticated || !user?.id || !accessTokenRef.current) return;
    if (!statusReady || isCheckingStatus) return;

    let live: ReturnType<typeof openChatLiveSocket> = null;
    const token = accessTokenRef.current;

    const startTimer = setTimeout(() => {
      if (!token) return;
      live = openChatLiveSocket({
        baseUrl: API_CONFIG.BASE_URL,
        token,
        onEvent: (eventName, payload) => {
          void qc.invalidateQueries({ queryKey: CLIENT_CHAT_QUERY_KEY });
          if (
            eventName !== "chat.message.sent" &&
            eventName !== "chat.room.updated"
          ) {
            return;
          }
          const senderId = readSenderId(payload);
          if (senderId && senderId === userIdRef.current) return;
          const roomId = readChatRoomId(payload);
          if (roomId && pathnameRef.current.includes(roomId)) return;
          const toastKey = `${roomId ?? ""}:${readMessageId(payload) ?? eventName}`;
          if (lastChatToastRef.current === toastKey) return;
          lastChatToastRef.current = toastKey;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Toast.show({
            type: "notification",
            text1: tRef.current("chatIncomingMessage"),
            visibilityTime: 7000,
            swipeable: true,
            position: "bottom",
          });
        },
      });
    }, LIVE_START_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      live?.close();
    };
  }, [
    isAuthenticated,
    isCheckingStatus,
    liveEnabled,
    qc,
    statusReady,
    user?.id,
  ]);

  return children;
}
