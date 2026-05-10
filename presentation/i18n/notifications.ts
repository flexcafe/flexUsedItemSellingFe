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
  | "noti.kbz.verified.body"
  | "noti.points.reviewReceived.title"
  | "noti.points.reviewReceived.body"
  | "noti.points.withdrawalRequested.title"
  | "noti.points.withdrawalRequested.body"
  | "noti.points.withdrawalApproved.title"
  | "noti.points.withdrawalApproved.body"
  | "noti.points.withdrawalRejected.title"
  | "noti.points.withdrawalRejected.body"
  | "noti.points.withdrawalPaid.title"
  | "noti.points.withdrawalPaid.body"
  | "noti.points.bonus.registration.title"
  | "noti.points.bonus.registration.body"
  | "noti.points.bonus.phone.title"
  | "noti.points.bonus.phone.body"
  | "noti.points.bonus.email.title"
  | "noti.points.bonus.email.body"
  | "noti.points.bonus.kbzpay.title"
  | "noti.points.bonus.kbzpay.body"
  | "noti.points.bonus.generic.title"
  | "noti.points.bonus.generic.body";

type Tf = (key: string, vars?: Record<string, unknown>) => string;

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toDisplay(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function getMetadata(n: ClientNotification): Record<string, unknown> {
  return (
    (n.metadata && typeof n.metadata === "object"
      ? (n.metadata as Record<string, unknown>)
      : {}) ?? {}
  );
}

export function localizeNotification(
  n: ClientNotification,
  tf: Tf,
  _locale: AppLocale,
): { title: string; body: string } {
  if (!n.eventKey) {
    return { title: n.title, body: n.message };
  }

  const md = getMetadata(n);
  switch (n.eventKey) {
    case "KBZPAY_VERIFICATION_REQUESTED_CLIENT":
      return {
        title: tf("noti.kbz.requested.title"),
        body: tf("noti.kbz.requested.body", {
          message: toSafeString(md.message),
        }),
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
        body: tf("noti.kbz.verified.body", {
          adminNote: toSafeString(md.adminNote),
        }),
      };

    case "POINTS_REVIEW_RECEIVED_CLIENT":
      return {
        title: tf("noti.points.reviewReceived.title"),
        body: tf("noti.points.reviewReceived.body", {
          stars: toDisplay(md.stars),
          pointsAwarded: toDisplay(md.pointsAwarded),
        }),
      };

    case "POINTS_WITHDRAWAL_REQUESTED_CLIENT":
      return {
        title: tf("noti.points.withdrawalRequested.title"),
        body: tf("noti.points.withdrawalRequested.body", {
          withdrawalId: toDisplay(md.withdrawalId),
          amount: toDisplay(md.amount),
        }),
      };

    case "POINTS_WITHDRAWAL_APPROVED_CLIENT":
      return {
        title: tf("noti.points.withdrawalApproved.title"),
        body: tf("noti.points.withdrawalApproved.body", {
          withdrawalId: toDisplay(md.withdrawalId),
          amount: toDisplay(md.amount),
          adminNote: toSafeString(md.adminNote),
        }),
      };

    case "POINTS_WITHDRAWAL_REJECTED_CLIENT":
      return {
        title: tf("noti.points.withdrawalRejected.title"),
        body: tf("noti.points.withdrawalRejected.body", {
          withdrawalId: toDisplay(md.withdrawalId),
          amount: toDisplay(md.amount),
          adminNote: toSafeString(md.adminNote),
        }),
      };

    case "POINTS_WITHDRAWAL_PAID_CLIENT":
      return {
        title: tf("noti.points.withdrawalPaid.title"),
        body: tf("noti.points.withdrawalPaid.body", {
          withdrawalId: toDisplay(md.withdrawalId),
          amount: toDisplay(md.amount),
          kbzTransferRef: toSafeString(md.kbzTransferRef),
        }),
      };

    case "POINTS_BONUS_REGISTRATION_CLIENT":
      return {
        title: tf("noti.points.bonus.registration.title"),
        body: tf("noti.points.bonus.registration.body", {
          amount: toDisplay(md.amount),
          sourceType: toSafeString(md.sourceType),
        }),
      };

    case "POINTS_BONUS_PHONE_VERIFIED_CLIENT":
      return {
        title: tf("noti.points.bonus.phone.title"),
        body: tf("noti.points.bonus.phone.body", {
          amount: toDisplay(md.amount),
          sourceType: toSafeString(md.sourceType),
        }),
      };

    case "POINTS_BONUS_EMAIL_VERIFIED_CLIENT":
      return {
        title: tf("noti.points.bonus.email.title"),
        body: tf("noti.points.bonus.email.body", {
          amount: toDisplay(md.amount),
          sourceType: toSafeString(md.sourceType),
        }),
      };

    case "POINTS_BONUS_KBZPAY_VERIFIED_CLIENT":
      return {
        title: tf("noti.points.bonus.kbzpay.title"),
        body: tf("noti.points.bonus.kbzpay.body", {
          amount: toDisplay(md.amount),
          sourceType: toSafeString(md.sourceType),
        }),
      };

    case "POINTS_BONUS_CLIENT":
      return {
        title: tf("noti.points.bonus.generic.title"),
        body: tf("noti.points.bonus.generic.body", {
          amount: toDisplay(md.amount),
          sourceType: toSafeString(md.sourceType),
        }),
      };

    default:
      return { title: n.title, body: n.message };
  }
}
