import type { ClientNotification } from "@/core/domain/entities/Notification";

export interface INotificationService {
  list(limit: number): Promise<ClientNotification[]>;
  markRead(notificationId: string): Promise<boolean>;
}

