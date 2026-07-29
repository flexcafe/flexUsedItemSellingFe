import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";

export interface IModerationRepository {
  submitContentReport(input: ContentReportInput): Promise<ContentReport>;
  listMyContentReports(): Promise<ContentReport[]>;
}
