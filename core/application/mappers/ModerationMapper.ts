import type {
  ContentReportDto,
  UnblockUserDto,
  UserBlockDto,
} from "@/core/application/dtos/ModerationDto";
import type {
  ContentReport,
  ContentReportReason,
  ContentReportStatus,
  ContentReportTargetType,
} from "@/core/domain/entities/ContentReport";
import {
  CONTENT_REPORT_REASONS,
  CONTENT_REPORT_TARGET_TYPES,
} from "@/core/domain/entities/ContentReport";
import type {
  UnblockResult,
  UserBlock,
} from "@/core/domain/entities/UserBlock";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
}

function asTargetType(value: unknown): ContentReportTargetType {
  const raw = asTrimmedString(value);
  return (CONTENT_REPORT_TARGET_TYPES as readonly string[]).includes(raw)
    ? (raw as ContentReportTargetType)
    : "LISTING";
}

function asReason(value: unknown): ContentReportReason {
  const raw = asTrimmedString(value);
  return (CONTENT_REPORT_REASONS as readonly string[]).includes(raw)
    ? (raw as ContentReportReason)
    : "OTHER";
}

function asStatus(value: unknown): ContentReportStatus {
  const raw = asTrimmedString(value);
  if (raw === "ACTIONED" || raw === "DISMISSED" || raw === "PENDING") {
    return raw;
  }
  return "PENDING";
}

export function toContentReport(
  dto: ContentReportDto | null | undefined,
): ContentReport {
  return {
    id: asTrimmedString(dto?.id),
    reporterId: asTrimmedString(dto?.reporterId),
    reporterNickname: asTrimmedString(dto?.reporterNickname),
    reportedUserId: asTrimmedString(dto?.reportedUserId),
    reportedUserNickname: asTrimmedString(dto?.reportedUserNickname),
    targetType: asTargetType(dto?.targetType),
    targetId: asTrimmedString(dto?.targetId),
    reason: asReason(dto?.reason),
    details: asNullableString(dto?.details),
    status: asStatus(dto?.status),
    adminNote: asNullableString(dto?.adminNote),
    createdAt: asTrimmedString(dto?.createdAt),
    updatedAt: asTrimmedString(dto?.updatedAt),
  };
}

export function toUserBlock(dto: UserBlockDto | null | undefined): UserBlock {
  return {
    id: asTrimmedString(dto?.id),
    blockedUserId: asTrimmedString(dto?.blockedUserId),
    blockedNickname: asTrimmedString(dto?.blockedNickname),
    blockedReferralCode: asTrimmedString(dto?.blockedReferralCode),
    reason: asNullableString(dto?.reason),
    createdAt: asTrimmedString(dto?.createdAt),
  };
}

export function toUnblockResult(
  dto: UnblockUserDto | null | undefined,
  fallbackUserId = "",
): UnblockResult {
  return {
    blockedUserId: asTrimmedString(dto?.blockedUserId) || fallbackUserId,
    unblocked: Boolean(dto?.unblocked ?? true),
  };
}
