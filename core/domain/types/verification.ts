export type VerificationAction =
  | "REGISTRATION_PENDING_VERIFICATION"
  | "PHONE_VERIFIED"
  | "EMAIL_VERIFIED";

export interface VerificationActionResult {
  action: VerificationAction;
}

