export interface UserBlockInput {
  blockedUserId: string;
  reason?: string;
}

export interface UserBlock {
  id: string;
  blockedUserId: string;
  blockedNickname: string;
  blockedReferralCode: string;
  reason: string | null;
  createdAt: string;
}

export interface UnblockResult {
  blockedUserId: string;
  unblocked: boolean;
}
