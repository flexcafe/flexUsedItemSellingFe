import type { ClientNotification } from "@/core/domain/entities/Notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_NOTIFICATIONS_QUERY_KEY = [
  "client",
  "notifications",
] as const;

/** Default list limit; keep in sync with tab badge + realtime cache updates. */
export const CLIENT_NOTIFICATIONS_DEFAULT_LIMIT = 20;

export function useNotifications(limit = CLIENT_NOTIFICATIONS_DEFAULT_LIMIT) {
  const { notificationService } = useServices();
  const { isAuthenticated, isLoading, user } = useAuth();
  return useQuery({
    queryKey: [...CLIENT_NOTIFICATIONS_QUERY_KEY, limit],
    queryFn: () => notificationService.list(limit),
    enabled: !isLoading && isAuthenticated && Boolean(user?.accessToken),
    // Avoid hammering guarded endpoint if token becomes invalid/missing.
    retry: false,
  });
}

export function useMarkNotificationRead(
  limit = CLIENT_NOTIFICATIONS_DEFAULT_LIMIT,
) {
  const { notificationService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markRead(notificationId),
    onSuccess: (_result, notificationId) => {
      qc.setQueryData<ClientNotification[] | undefined>(
        [...CLIENT_NOTIFICATIONS_QUERY_KEY, limit],
        (prev) =>
          (prev ?? []).map((item) =>
            item.id === notificationId ? { ...item, isRead: true } : item,
          ),
      );
    },
  });
}
