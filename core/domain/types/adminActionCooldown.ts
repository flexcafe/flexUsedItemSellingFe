/** Client-side throttle so users cannot spam admin-triggering actions. */
export const ADMIN_ACTION_NOTIFY_COOLDOWN_MS = 2 * 60 * 60 * 1000;

export type AdminActionCooldownId =
  | "kbzPayVerificationRequest"
  | "kbzPayTransactionSubmit"
  | "withdrawalRequest";
