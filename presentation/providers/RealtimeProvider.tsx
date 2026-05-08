import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import { toClientNotification } from "@/core/application/mappers/NotificationMapper";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import { CLIENT_NOTIFICATIONS_QUERY_KEY } from "@/presentation/hooks/useNotifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? "";
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? "";

function parseNotificationPayload(rawData: unknown): ClientNotification | null {
  try {
    const value =
      typeof rawData === "string" ? (JSON.parse(rawData) as unknown) : rawData;
    const dto = (value as { notification?: ClientNotificationDto; data?: ClientNotificationDto })
      ?.notification ??
      (value as { data?: ClientNotificationDto })?.data ??
      (value as ClientNotificationDto);
    const notification = toClientNotification(dto ?? {});
    return notification.id ? notification : null;
  } catch {
    return null;
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user.accessToken) return;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;

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
            qc.setQueriesData(
              { queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY },
              (prev: ClientNotification[] | undefined) => {
                const list = prev ?? [];
                if (list.some((item) => item.id === incoming.id)) return list;
                return [incoming, ...list];
              },
            );
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
      void pusher.unsubscribe({ channelName });
      void pusher.disconnect();
    };
  }, [isAuthenticated, qc, user?.accessToken, user?.id]);

  return children;
}

