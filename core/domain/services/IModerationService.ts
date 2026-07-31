import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
import type {
  UnblockResult,
  UserBlock,
  UserBlockInput,
} from "@/core/domain/entities/UserBlock";

export interface IModerationService {
  submitContentReport(input: ContentReportInput): Promise<ContentReport>;
  listMyContentReports(): Promise<ContentReport[]>;
  blockUser(input: UserBlockInput): Promise<UserBlock>;
  unblockUser(userId: string): Promise<UnblockResult>;
  listMyBlocks(): Promise<UserBlock[]>;
  listBlockedUserIds(): Promise<string[]>;
}
