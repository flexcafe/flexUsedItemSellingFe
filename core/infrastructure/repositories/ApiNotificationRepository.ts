import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import { toClientNotification } from "@/core/application/mappers/NotificationMapper";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { INotificationRepository } from "@/core/domain/repositories/INotificationRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

export class ApiNotificationRepository implements INotificationRepository {
  constructor(private readonly http: HttpClient) {}

  async list(limit: number): Promise<ClientNotification[]> {
    const res = await this.http.get<
      ClientNotificationDto[] | { data?: ClientNotificationDto[] }
    >(API_ENDPOINTS.NOTIFICATIONS.LIST, {
      params: { limit },
    });
    const list = Array.isArray(res) ? res : res?.data ?? [];
    return list.map(toClientNotification);
  }

  async markRead(notificationId: string): Promise<boolean> {
    const res = await this.http.patch<boolean>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
      {},
    );
    return Boolean(res);
  }
}

