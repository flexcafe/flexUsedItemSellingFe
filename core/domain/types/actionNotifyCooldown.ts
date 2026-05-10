/** Actions that notify admins; client-side cooldown limits repeat taps. */
export type ActionNotifyCooldownKey =
  | "kbzPayVerificationRequest"
  | "kbzPaySubmitTransaction"
  | "withdrawalRequest";

/** Cooldown after a successful request (ms). */
export const ACTION_NOTIFY_COOLDOWN_MS = 2 * 60 * 60 * 1000;
