import type { ClientNotification } from "@/core/domain/entities/Notification";
import type { AppLocale } from "@/core/domain/types/locale";

export const CHAT_EVENT_PREFIX = "CHAT_";

export function isChatNotification(
  n: Pick<ClientNotification, "eventKey">,
): boolean {
  return n.eventKey?.startsWith(CHAT_EVENT_PREFIX) ?? false;
}

export function isGeneralNotification(
  n: Pick<ClientNotification, "eventKey">,
): boolean {
  if (!n.eventKey) return true;
  return !isChatNotification(n);
}

type Tf = (key: string, vars?: Record<string, unknown>) => string;

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function readTradeRole(
  md: Record<string, unknown>,
): "buyer" | "seller" | null {
  const role = md.role;
  if (role === "buyer" || role === "seller") return role;
  return null;
}

function appendNote(body: string, note: string, noteKey: string, tf: Tf): string {
  if (!note) return body;
  return `${body}\n${tf(noteKey, { adminNote: note })}`;
}

function localizeChatNotification(
  eventKey: string,
  md: Record<string, unknown>,
  tf: Tf,
): { title: string; body: string } | null {
  switch (eventKey) {
    case "CHAT_SAFE_PAYMENT_REQUESTED_CLIENT":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.body"),
      };
    case "CHAT_SAFE_PAYMENT_REQUESTED_ADMIN":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.body"),
      };
    case "CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT": {
      const adminNote = toSafeString(md.adminNote);
      const body = tf(
        "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.body",
        { adminReceivingPhone: toSafeString(md.adminReceivingPhone) },
      );
      return {
        title: tf(
          "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.title",
        ),
        body: appendNote(
          body,
          adminNote,
          "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.bodyNote",
          tf,
        ),
      };
    }
    case "CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN":
      return {
        title: tf(
          "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.title",
        ),
        body: tf(
          "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.body",
          { adminReceivingPhone: toSafeString(md.adminReceivingPhone) },
        ),
      };
    case "CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.body"),
      };
    case "CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.body", {
          kbzTransactionId: toSafeString(md.kbzTransactionId),
          paymentAmount: toDisplay(md.paymentAmount),
        }),
      };
    case "CHAT_SAFE_PAYMENT_RECEIVED_CLIENT": {
      const role = readTradeRole(md);
      const prefix =
        role === "seller"
          ? "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller"
          : "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer";
      const adminNote = toSafeString(md.adminNote);
      const body = tf(`${prefix}.body`);
      return {
        title: tf(`${prefix}.title`),
        body: appendNote(
          body,
          adminNote,
          `${prefix}.bodyNote`,
          tf,
        ),
      };
    }
    case "CHAT_SAFE_PAYMENT_RECEIVED_ADMIN":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.body"),
      };
    case "CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT": {
      const role = readTradeRole(md);
      const prefix =
        role === "buyer"
          ? "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.buyer"
          : "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.seller";
      return {
        title: tf(`${prefix}.title`),
        body: tf(`${prefix}.body`, {
          transferRef: toSafeString(md.transferRef),
        }),
      };
    }
    case "CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN":
      return {
        title: tf("noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.title"),
        body: tf("noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.body", {
          transferRef: toSafeString(md.transferRef),
        }),
      };
    default:
      return null;
  }
}

export function localizeNotification(
  n: ClientNotification,
  tf: Tf,
  _locale: AppLocale,
): { title: string; body: string } {
  if (!n.eventKey) {
    return { title: n.title, body: n.message };
  }

  if (isChatNotification(n)) {
    const chat = localizeChatNotification(n.eventKey, getMetadata(n), tf);
    if (chat) return chat;
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

    case "FACEBOOK_LINKED_CLIENT":
      return {
        title: tf("noti.facebook.linked.title"),
        body: tf("noti.facebook.linked.body", {
          facebookName: toSafeString(md.facebookName),
        }),
      };

    case "FACEBOOK_FOLLOW_SUBMITTED_CLIENT":
      return {
        title: tf("noti.facebook.followSubmitted.title"),
        body: tf("noti.facebook.followSubmitted.body", {
          facebookPageUrl: toSafeString(md.facebookPageUrl),
        }),
      };

    case "POINTS_FACEBOOK_FOLLOW_REWARDED_CLIENT":
      return {
        title: tf("noti.facebook.rewarded.title"),
        body: tf("noti.facebook.rewarded.body"),
      };

    default:
      return { title: n.title, body: n.message };
  }
}
