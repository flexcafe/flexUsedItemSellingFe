import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
import type {
  UnblockResult,
  UserBlock,
  UserBlockInput,
} from "@/core/domain/entities/UserBlock";
import type { IModerationRepository } from "@/core/domain/repositories/IModerationRepository";
import type { IModerationService } from "@/core/domain/services/IModerationService";

export class ModerationService implements IModerationService {
  constructor(private readonly repo: IModerationRepository) {}

  submitContentReport(input: ContentReportInput): Promise<ContentReport> {
    return this.repo.submitContentReport(input);
  }

  listMyContentReports(): Promise<ContentReport[]> {
    return this.repo.listMyContentReports();
  }

  blockUser(input: UserBlockInput): Promise<UserBlock> {
    return this.repo.blockUser(input);
  }

  unblockUser(userId: string): Promise<UnblockResult> {
    return this.repo.unblockUser(userId);
  }

  listMyBlocks(): Promise<UserBlock[]> {
    return this.repo.listMyBlocks();
  }

  listBlockedUserIds(): Promise<string[]> {
    return this.repo.listBlockedUserIds();
  }
}
