import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import { toClientNotification } from "@/core/application/mappers/NotificationMapper";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
  CLIENT_NOTIFICATIONS_QUERY_KEY,
} from "@/presentation/hooks/useNotifications";
import { showIncomingNotificationToast } from "@/presentation/notifications/show-incoming-notification-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import { useAuth } from "./AuthProvider";
import { useLocale } from "./LocaleProvider";
import { useServices } from "./ServicesProvider";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "";
const POLL_INTERVAL_MS = 5000;
const ENABLE_PUSHER_ON_ANDROID =
  process.env.EXPO_PUBLIC_ENABLE_PUSHER_ANDROID === "1";

function unwrapMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function extractNotificationDto(rawData: unknown): ClientNotificationDto | null {
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

function parseNotificationPayload(rawData: unknown): ClientNotification | null {
  const dto = extractNotificationDto(rawData);
  if (!dto) return null;
  const notification = toClientNotification(dto);
  return notification.id ? notification : null;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { locale, tf, t } = useLocale();
  const { notificationService } = useServices();
  const qc = useQueryClient();

  /** Pusher must not reconnect on locale change (native Android can NPE); toast uses latest copy. */
  const localeRef = useRef(locale);
  const tfRef = useRef(tf);
  const tRef = useRef(t);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  localeRef.current = locale;
  tfRef.current = tf;
  tRef.current = t;

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

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user.accessToken) return;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;
    if (Platform.OS === "android" && !ENABLE_PUSHER_ON_ANDROID) return;

    let mounted = true;
    const channelName = `private-user-${user.id}`;
    type PusherClient = {
      init: (args: unknown) => Promise<void>;
      subscribe: (args: unknown) => Promise<void>;
      connect: () => Promise<void>;
      unsubscribe: (args: unknown) => Promise<void>;
      disconnect: () => Promise<void>;
    };

    let pusher: PusherClient | null = null;

    (async () => {
      try {
        // IMPORTANT: In Expo Go / managed workflow, this native module isn't available.
        // We load it dynamically to avoid crashing the whole app.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@pusher/pusher-websocket-react-native") as {
          Pusher?: { getInstance: () => PusherClient };
        };
        pusher = mod?.Pusher?.getInstance?.() ?? null;
        if (!pusher) return;

        await pusher.init({
          apiKey: PUSHER_KEY,
          cluster: PUSHER_CLUSTER,
          authEndpoint: `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PUSHER.AUTH}`,
          auth: {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          },
        });

        await pusher.subscribe({
          channelName,
          onEvent: (event: { eventName?: string; data?: unknown }) => {
            if (event.eventName !== "notification.created") return;
            const incoming = parseNotificationPayload(event.data);
            if (!incoming) return;
            const listKey = [
              ...CLIENT_NOTIFICATIONS_QUERY_KEY,
              CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
            ] as const;
            const existing =
              qc.getQueryData<ClientNotification[]>(listKey) ?? [];
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
          },
        });

        if (mounted) {
          await pusher.connect();
        }
      } catch {
        // Swallow: realtime is optional and should not break app startup.
      }
    })();

    return () => {
      mounted = false;
      if (!pusher) return;
      try {
        void pusher.unsubscribe({ channelName });
      } catch {
        // Native bridge can throw if already torn down.
      }
      try {
        void pusher.disconnect();
      } catch {
        // Same as above.
      }
    };
  }, [isAuthenticated, qc, user?.accessToken, user?.id]);

  return children;
}

