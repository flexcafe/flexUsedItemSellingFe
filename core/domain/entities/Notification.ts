export interface ClientNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  eventKey: string | null;
  metadata: unknown;
  isRead: boolean;
  referenceId: unknown;
  createdAt: string;
}

