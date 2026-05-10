import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import { toClientNotification } from "@/core/application/mappers/NotificationMapper";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { INotificationRepository } from "@/core/domain/repositories/INotificationRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractNotificationList(res: unknown): ClientNotificationDto[] {
  if (Array.isArray(res)) return res;
  if (res != null && typeof res === "object") {
    const r = res as Record<string, unknown>;
    const direct = r.data;
    if (Array.isArray(direct)) return direct as ClientNotificationDto[];
    if (
      direct != null &&
      typeof direct === "object" &&
      !Array.isArray(direct)
    ) {
      const inner = direct as Record<string, unknown>;
      for (const k of ["items", "notifications", "rows", "list"]) {
        const arr = inner[k];
        if (Array.isArray(arr)) return arr as ClientNotificationDto[];
      }
    }
    for (const k of ["items", "notifications", "rows"]) {
      const arr = r[k];
      if (Array.isArray(arr)) return arr as ClientNotificationDto[];
    }
  }
  return [];
}

export class ApiNotificationRepository implements INotificationRepository {
  constructor(private readonly http: HttpClient) {}

  async list(limit: number): Promise<ClientNotification[]> {
    const res = await this.http.get<unknown>(API_ENDPOINTS.NOTIFICATIONS.LIST, {
      params: { limit },
    });
    return extractNotificationList(res).map(toClientNotification);
  }

  async markRead(notificationId: string): Promise<boolean> {
    const res = await this.http.patch<boolean>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
      {},
    );
    return Boolean(res);
  }
}
