import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import type { ClientNotification } from "@/core/domain/entities/Notification";

export function toClientNotification(dto: ClientNotificationDto): ClientNotification {
  return {
    id: String(dto.id ?? ""),
    title: typeof dto.title === "string" ? dto.title : "",
    message: typeof dto.message === "string" ? dto.message : "",
    type: typeof dto.type === "string" ? dto.type : "",
    eventKey: typeof dto.eventKey === "string" ? dto.eventKey : null,
    metadata: dto.metadata ?? null,
    isRead: Boolean(dto.isRead),
    referenceId: dto.referenceId ?? null,
    createdAt: typeof dto.createdAt === "string" ? dto.createdAt : "",
  };
}

