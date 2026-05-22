/** UUID v4-ish — never valid as a public invite code for register. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function normalizeReferralCodeInput(value: string): string {
  return value.trim();
}

export function mapRegisterReferralError(
  serverMessage: string | undefined,
  invalidLabel: string,
  fallback: string,
): string {
  if (!serverMessage?.trim()) return fallback;
  const lower = serverMessage.toLowerCase();
  if (
    lower.includes("invalid referralid") ||
    lower.includes("invalid referral id") ||
    lower.includes("invalid referral code")
  ) {
    return invalidLabel;
  }
  return serverMessage.trim();
}
