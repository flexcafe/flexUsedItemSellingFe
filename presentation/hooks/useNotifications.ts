import type { ClientNotification } from "@/core/domain/entities/Notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_NOTIFICATIONS_QUERY_KEY = ["client", "notifications"] as const;

export function useNotifications(limit = 20) {
  const { notificationService } = useServices();
  return useQuery({
    queryKey: [...CLIENT_NOTIFICATIONS_QUERY_KEY, limit],
    queryFn: () => notificationService.list(limit),
  });
}

export function useMarkNotificationRead(limit = 20) {
  const { notificationService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markRead(notificationId),
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

