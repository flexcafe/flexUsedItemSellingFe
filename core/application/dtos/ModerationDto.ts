import type {
  ContentReportReason,
  ContentReportStatus,
  ContentReportTargetType,
} from "@/core/domain/entities/ContentReport";

export interface ContentReportDto {
  id?: string | null;
  reporterId?: string | null;
  reporterNickname?: string | null;
  reportedUserId?: string | null;
  reportedUserNickname?: string | null;
  targetType?: ContentReportTargetType | string | null;
  targetId?: string | null;
  reason?: ContentReportReason | string | null;
  details?: string | null;
  status?: ContentReportStatus | string | null;
  adminNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SubmitContentReportRequestDto {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}

export interface UserBlockDto {
  id?: string | null;
  blockedUserId?: string | null;
  blockedNickname?: string | null;
  blockedReferralCode?: string | null;
  reason?: string | null;
  createdAt?: string | null;
}

export interface BlockUserRequestDto {
  blockedUserId: string;
  reason?: string;
}

export interface UnblockUserDto {
  blockedUserId?: string | null;
  unblocked?: boolean | null;
}
