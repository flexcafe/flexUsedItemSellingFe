import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  RankConfig,
  WithdrawalRequest,
} from "@/core/domain/entities/ProfileRewards";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type {
  AvatarUploadResult,
  ChangePasswordInput,
  FacebookFollowSubmission,
  FacebookFollowSubmissionInput,
  FacebookLinkInput,
  UploadFile,
} from "@/core/domain/types/profile";

export class ProfileService implements IProfileService {
  constructor(private readonly repo: IProfileRepository) {}

  getRankConfigs(): Promise<RankConfig[]> {
    return this.repo.getRankConfigs();
  }

  getPointsSummary(): Promise<ProfilePointsSummary> {
    return this.repo.getPointsSummary();
  }

  getTransactionStats(): Promise<ProfileTransactionStats> {
    return this.repo.getTransactionStats();
  }

  getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return this.repo.getWithdrawalRequests();
  }

  requestWithdrawal(amount: number): Promise<WithdrawalRequest> {
    return this.repo.requestWithdrawal(amount);
  }

  changePassword(input: ChangePasswordInput): Promise<boolean> {
    return this.repo.changePassword(input);
  }

  uploadAvatar(file: UploadFile): Promise<AvatarUploadResult> {
    return this.repo.uploadAvatar(file);
  }

  linkFacebookAccount(input: FacebookLinkInput): Promise<boolean> {
    return this.repo.linkFacebookAccount(input);
  }

  getLatestFacebookFollowSubmission(): Promise<FacebookFollowSubmission | null> {
    return this.repo.getLatestFacebookFollowSubmission();
  }

  submitFacebookFollowSubmission(
    input: FacebookFollowSubmissionInput,
  ): Promise<FacebookFollowSubmission> {
    return this.repo.submitFacebookFollowSubmission(input);
  }
}
