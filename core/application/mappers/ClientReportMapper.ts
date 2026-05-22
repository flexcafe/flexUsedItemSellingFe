import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import type {
  ClientFraudReportDto,
  ClientSuggestionDto,
} from "../dtos/ClientReportDto";

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

export function toClientSuggestion(dto: ClientSuggestionDto): ClientSuggestion {
  return {
    id: toStringValue(dto.id),
    userId: toNullableString(dto.userId),
    userNickname: toNullableString(dto.userNickname),
    userPhone: toNullableString(dto.userPhone),
    nickname: toStringValue(dto.nickname),
    name: toStringValue(dto.name),
    details: toStringValue(dto.details),
    status: toStringValue(dto.status, "PENDING"),
    pointsAwarded: toNumberValue(dto.pointsAwarded),
    adminNote: toNullableString(dto.adminNote),
    reviewedById: toNullableString(dto.reviewedById),
    reviewedAt: toNullableString(dto.reviewedAt),
    createdAt: toStringValue(dto.createdAt),
    updatedAt: toStringValue(dto.updatedAt),
  };
}

export function toClientFraudReport(
  dto: ClientFraudReportDto,
): ClientFraudReport {
  return {
    id: toStringValue(dto.id),
    reporterId: toNullableString(dto.reporterId),
    reporterNickname: toNullableString(dto.reporterNickname),
    reporterPhone: toNullableString(dto.reporterPhone),
    reportedUserId: toNullableString(dto.reportedUserId),
    reportedUserNickname: toNullableString(dto.reportedUserNickname),
    reportedUserPhone: toNullableString(dto.reportedUserPhone),
    fraudUserName: toStringValue(dto.fraudUserName),
    reportedReferralCode: toStringValue(dto.reportedReferralCode),
    tradeDate: toNullableString(dto.tradeDate),
    tradeTime: toNullableString(dto.tradeTime),
    fraudType: toStringValue(dto.fraudType, "OTHER"),
    details: toStringValue(dto.details),
    status: toStringValue(dto.status, "PENDING"),
    adminNote: toNullableString(dto.adminNote),
    reviewedById: toNullableString(dto.reviewedById),
    reviewedAt: toNullableString(dto.reviewedAt),
    reportedUserIsBanned: toBooleanValue(dto.reportedUserIsBanned),
    createdAt: toStringValue(dto.createdAt),
    updatedAt: toStringValue(dto.updatedAt),
  };
}
