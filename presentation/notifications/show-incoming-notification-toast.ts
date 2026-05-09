import Toast from "react-native-toast-message";

import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { AppLocale } from "@/core/domain/types/locale";
import { localizeNotification } from "@/presentation/i18n/notifications";

type TemplateFn = (
  key: string,
  vars?: Record<string, unknown>,
) => string;

/** Toast for a push notification; copy matches NotificationsScreen + localizeNotification. */
export function showIncomingNotificationToast(
  notification: ClientNotification,
  locale: AppLocale,
  tf: TemplateFn,
  titleFallback: string,
): void {
  const { title, body } = localizeNotification(notification, tf, locale);
  const text1 = title.trim() || titleFallback;
  const text2 = body.trim();
  Toast.show({
    type: "notification",
    text1,
    ...(text2 ? { text2 } : {}),
    visibilityTime: 5200,
  });
}
