import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "../entities/ProfileRewards";
import type { AvatarUploadResult, ChangePasswordInput, UploadFile } from "../types/profile";

export interface IProfileService {
  getPointsSummary(): Promise<ProfilePointsSummary>;
  getTransactionStats(): Promise<ProfileTransactionStats>;
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  requestWithdrawal(amount: number): Promise<WithdrawalRequest>;
  changePassword(input: ChangePasswordInput): Promise<boolean>;
  uploadAvatar(file: UploadFile): Promise<AvatarUploadResult>;
}
