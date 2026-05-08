export interface ClientNotificationDto {
  id?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  eventKey?: string | null;
  metadata?: unknown;
  isRead?: boolean | null;
  referenceId?: unknown;
  createdAt?: string | null;
}

