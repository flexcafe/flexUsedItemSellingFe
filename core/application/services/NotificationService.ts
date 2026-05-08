import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { INotificationRepository } from "@/core/domain/repositories/INotificationRepository";
import type { INotificationService } from "@/core/domain/services/INotificationService";

export class NotificationService implements INotificationService {
  constructor(private readonly repo: INotificationRepository) {}

  list(limit: number): Promise<ClientNotification[]> {
    return this.repo.list(limit);
  }

  markRead(notificationId: string): Promise<boolean> {
    return this.repo.markRead(notificationId);
  }
}

