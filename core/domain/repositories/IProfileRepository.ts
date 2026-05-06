import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "../entities/ProfileRewards";

export interface IProfileRepository {
  getPointsSummary(): Promise<ProfilePointsSummary>;
  getTransactionStats(): Promise<ProfileTransactionStats>;
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  requestWithdrawal(amount: number): Promise<WithdrawalRequest>;
}
