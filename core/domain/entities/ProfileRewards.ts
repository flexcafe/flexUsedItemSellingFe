export type UserRankTier = "NEWBIE" | "BRONZE" | "SILVER" | "GOLD" | "VIP";

export interface RankConfig {
  tier: UserRankTier;
  minPoints: number;
  maxPoints: number | null;
  label: string;
  badgeUrl: string | null;
  sortOrder: number;
}

export interface ProfilePointsSummary {
  userId: string;
  nickname: string;
  totalPoints: number;
  availableWithdrawalPoints: number;
  currentRank: UserRankTier;
  currentRankConfig: RankConfig | null;
  nextRankConfig: RankConfig | null;
  pendingWithdrawalAmount: number;
}

export interface ProfileTransactionStats {
  userId: string;
  totalTransactionsMade: number;
  completedSales: number;
  completedPurchases: number;
}

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "TRANSFERRED";

export interface WithdrawalRequest {
  id: string;
  userId: string;
  nickname: string;
  phone: string;
  kbzPayAccountName: string | null;
  kbzPayPhoneNumber: string | null;
  amount: number;
  status: WithdrawalStatus;
  adminNote: string | null;
  processedById: string | null;
  processedAt: string | null;
  kbzTransferRef: string | null;
  createdAt: string;
  updatedAt: string;
}
