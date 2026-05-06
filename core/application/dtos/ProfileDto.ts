import type { UserRankTier, WithdrawalStatus } from "@/core/domain/entities/ProfileRewards";

export interface RankConfigDto {
  tier?: UserRankTier | string | null;
  minPoints?: number | string | null;
  maxPoints?: number | string | null;
  label?: string | null;
  badgeUrl?: string | null;
  sortOrder?: number | string | null;
}

export interface ProfilePointsSummaryDto {
  userId?: string | null;
  nickname?: string | null;
  totalPoints?: number | string | null;
  availableWithdrawalPoints?: number | string | null;
  currentRank?: UserRankTier | string | null;
  currentRankConfig?: RankConfigDto | null;
  nextRankConfig?: RankConfigDto | null;
  pendingWithdrawalAmount?: number | string | null;
}

export interface ProfileTransactionStatsDto {
  userId?: string | null;
  totalTransactionsMade?: number | string | null;
  completedSales?: number | string | null;
  completedPurchases?: number | string | null;
}

export interface WithdrawalRequestDto {
  id?: string | null;
  userId?: string | null;
  nickname?: string | null;
  phone?: string | null;
  kbzPayAccountName?: string | null;
  kbzPayPhoneNumber?: string | null;
  amount?: number | string | null;
  status?: WithdrawalStatus | string | null;
  adminNote?: string | null;
  processedById?: string | null;
  processedAt?: string | null;
  kbzTransferRef?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WithdrawalRequestInputDto {
  amount: number;
}
