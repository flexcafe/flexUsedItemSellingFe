export type ContentReportTargetType =
  | "LISTING"
  | "CHAT_MESSAGE"
  | "REVIEW"
  | "USER_PROFILE";

export type ContentReportReason =
  | "OBJECTIONABLE_CONTENT"
  | "HARASSMENT"
  | "HATE_SPEECH"
  | "SEXUAL_CONTENT"
  | "SPAM"
  | "VIOLENCE"
  | "SCAM"
  | "OTHER";

export type ContentReportStatus = "PENDING" | "ACTIONED" | "DISMISSED";

export const CONTENT_REPORT_TARGET_TYPES = [
  "LISTING",
  "CHAT_MESSAGE",
  "REVIEW",
  "USER_PROFILE",
] as const satisfies readonly ContentReportTargetType[];

export const CONTENT_REPORT_REASONS = [
  "OBJECTIONABLE_CONTENT",
  "HARASSMENT",
  "HATE_SPEECH",
  "SEXUAL_CONTENT",
  "SPAM",
  "VIOLENCE",
  "SCAM",
  "OTHER",
] as const satisfies readonly ContentReportReason[];

export interface ContentReportInput {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedUserNickname: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details: string | null;
  status: ContentReportStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}
