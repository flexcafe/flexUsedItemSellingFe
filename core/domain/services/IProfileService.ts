import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "../entities/ProfileRewards";

export interface IProfileService {
  getPointsSummary(): Promise<ProfilePointsSummary>;
  getTransactionStats(): Promise<ProfileTransactionStats>;
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  requestWithdrawal(amount: number): Promise<WithdrawalRequest>;
}
