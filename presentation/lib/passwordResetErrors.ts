export function mapForgotPasswordError(
  status: number | undefined,
  serverMessage: string | undefined,
  labels: {
    deactivated: string;
    adminAccount: string;
    phoneNotFound: string;
    rateLimit: string;
    fallback: string;
  },
): string {
  if (status === 401) return labels.deactivated;
  if (status === 403) return labels.adminAccount;
  if (status === 404) return labels.phoneNotFound;
  if (status === 429) return labels.rateLimit;
  if (serverMessage?.trim()) return serverMessage.trim();
  return labels.fallback;
}

export function mapResetPasswordError(
  status: number | undefined,
  serverMessage: string | undefined,
  labels: {
    mismatch: string;
    invalidOtp: string;
    phoneNotFound: string;
    rateLimit: string;
    fallback: string;
  },
): string {
  if (status === 400) {
    const lower = (serverMessage ?? "").toLowerCase();
    if (
      lower.includes("mismatch") ||
      lower.includes("pending reset") ||
      lower.includes("no pending")
    ) {
      return labels.mismatch;
    }
    return labels.mismatch;
  }
  if (status === 401) return labels.invalidOtp;
  if (status === 404) return labels.phoneNotFound;
  if (status === 429) return labels.rateLimit;
  if (serverMessage?.trim()) return serverMessage.trim();
  return labels.fallback;
}
