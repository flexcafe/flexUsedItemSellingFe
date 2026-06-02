import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  RankConfig,
  WithdrawalRequest,
} from "../entities/ProfileRewards";
import type {
  AvatarUploadResult,
  ChangePasswordInput,
  FacebookFollowSubmission,
  FacebookFollowSubmissionInput,
  FacebookLinkInput,
  UploadFile,
} from "../types/profile";

export interface IProfileService {
  getRankConfigs(): Promise<RankConfig[]>;
  getPointsSummary(): Promise<ProfilePointsSummary>;
  getTransactionStats(): Promise<ProfileTransactionStats>;
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  requestWithdrawal(amount: number): Promise<WithdrawalRequest>;
  changePassword(input: ChangePasswordInput): Promise<boolean>;
  uploadAvatar(file: UploadFile): Promise<AvatarUploadResult>;
  linkFacebookAccount(input: FacebookLinkInput): Promise<boolean>;
  getLatestFacebookFollowSubmission(): Promise<FacebookFollowSubmission | null>;
  submitFacebookFollowSubmission(
    input: FacebookFollowSubmissionInput,
  ): Promise<FacebookFollowSubmission>;
}
