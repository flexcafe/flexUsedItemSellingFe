import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { AppLocale } from "@/core/domain/types/locale";

export type NotificationI18nKey =
  | "noti.kbz.requested.title"
  | "noti.kbz.requested.body"
  | "noti.kbz.instruction.title"
  | "noti.kbz.instruction.body"
  | "noti.kbz.transactionSubmitted.title"
  | "noti.kbz.transactionSubmitted.body"
  | "noti.kbz.verified.title"
  | "noti.kbz.verified.body";

type Tf = (key: string, vars?: Record<string, unknown>) => string;

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getMetadata(n: ClientNotification): Record<string, unknown> {
  return (n.metadata && typeof n.metadata === "object" ? (n.metadata as Record<string, unknown>) : {}) ?? {};
}

export function localizeNotification(
  n: ClientNotification,
  tf: Tf,
  _locale: AppLocale,
): { title: string; body: string } {
  const md = getMetadata(n);
  switch (n.eventKey) {
    case "KBZPAY_VERIFICATION_REQUESTED_CLIENT":
      return {
        title: tf("noti.kbz.requested.title"),
        body: tf("noti.kbz.requested.body", { message: toSafeString(md.message) }),
      };
    case "KBZPAY_INSTRUCTION_SENT_CLIENT":
      return {
        title: tf("noti.kbz.instruction.title"),
        body: tf("noti.kbz.instruction.body", {
          transferPhone: toSafeString(md.transferPhone),
          amount: toSafeString(md.amount),
          adminNote: toSafeString(md.adminNote),
        }),
      };
    case "KBZPAY_TRANSACTION_SUBMITTED_CLIENT":
      return {
        title: tf("noti.kbz.transactionSubmitted.title"),
        body: tf("noti.kbz.transactionSubmitted.body", {
          kbzTransactionId: toSafeString(md.kbzTransactionId),
        }),
      };
    case "KBZPAY_VERIFIED_CLIENT":
      return {
        title: tf("noti.kbz.verified.title"),
        body: tf("noti.kbz.verified.body", { adminNote: toSafeString(md.adminNote) }),
      };
    default:
      return { title: n.title, body: n.message };
  }
}

