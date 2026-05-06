import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "@/core/domain/entities/ProfileRewards";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type { IProfileService } from "@/core/domain/services/IProfileService";

export class ProfileService implements IProfileService {
  constructor(private readonly repo: IProfileRepository) {}

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
}
