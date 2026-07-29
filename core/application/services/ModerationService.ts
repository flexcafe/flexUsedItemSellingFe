import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
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
}
