import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  RankConfig,
  UserRankTier,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/core/domain/entities/ProfileRewards";
import type { FacebookFollowSubmission } from "@/core/domain/types/profile";
import type {
  ProfilePointsSummaryDto,
  ProfileTransactionStatsDto,
  FacebookFollowSubmissionDto,
  RankConfigDto,
  WithdrawalRequestDto,
} from "../dtos/ProfileDto";
import { toAbsoluteMediaUrl } from "./mediaUrl";

const RANKS: UserRankTier[] = ["NEWBIE", "BRONZE", "SILVER", "GOLD", "VIP"];
const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "TRANSFERRED",
];

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRank(value: unknown): UserRankTier {
  const raw = typeof value === "string" ? value.toUpperCase() : "";
  return RANKS.includes(raw as UserRankTier) ? (raw as UserRankTier) : "NEWBIE";
}

function toWithdrawalStatus(value: unknown): WithdrawalStatus {
  const raw = typeof value === "string" ? value.toUpperCase() : "";
  return WITHDRAWAL_STATUSES.includes(raw as WithdrawalStatus)
    ? (raw as WithdrawalStatus)
    : "PENDING";
}

export function toRankConfig(
  dto: RankConfigDto | null | undefined,
): RankConfig | null {
  if (!dto) return null;
  const tier = toRank(dto.tier);
  const rawBadge = toNullableString(dto.badgeUrl);
  const badgeAbsolute =
    rawBadge && rawBadge.length > 0 ? toAbsoluteMediaUrl(rawBadge) : "";
  return {
    tier,
    minPoints: toNumber(dto.minPoints),
    maxPoints: toNullableNumber(dto.maxPoints),
    label: toStringValue(dto.label, tier),
    badgeUrl: badgeAbsolute || null,
    sortOrder: toNumber(dto.sortOrder),
  };
}

/** Maps API rank ladder rows; drops invalid entries; sorts by `sortOrder`. */
export function toRankConfigsFromDtos(dtos: RankConfigDto[]): RankConfig[] {
  return dtos
    .map((d) => toRankConfig(d))
    .filter((c): c is RankConfig => c !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toProfilePointsSummary(
  dto: ProfilePointsSummaryDto,
): ProfilePointsSummary {
  return {
    userId: toStringValue(dto.userId),
    nickname: toStringValue(dto.nickname),
    totalPoints: toNumber(dto.totalPoints),
    availableWithdrawalPoints: toNumber(dto.availableWithdrawalPoints),
    currentRank: toRank(dto.currentRank),
    currentRankConfig: toRankConfig(dto.currentRankConfig),
    nextRankConfig: toRankConfig(dto.nextRankConfig),
    pendingWithdrawalAmount: toNumber(dto.pendingWithdrawalAmount),
  };
}

export function toProfileTransactionStats(
  dto: ProfileTransactionStatsDto,
): ProfileTransactionStats {
  return {
    userId: toStringValue(dto.userId),
    totalTransactionsMade: toNumber(dto.totalTransactionsMade),
    completedSales: toNumber(dto.completedSales),
    completedPurchases: toNumber(dto.completedPurchases),
  };
}

export function toWithdrawalRequest(
  dto: WithdrawalRequestDto,
): WithdrawalRequest {
  return {
    id: toStringValue(dto.id),
    userId: toStringValue(dto.userId),
    nickname: toStringValue(dto.nickname),
    phone: toStringValue(dto.phone),
    kbzPayAccountName: toNullableString(dto.kbzPayAccountName),
    kbzPayPhoneNumber: toNullableString(dto.kbzPayPhoneNumber),
    amount: toNumber(dto.amount),
    status: toWithdrawalStatus(dto.status),
    adminNote: toNullableString(dto.adminNote),
    processedById: toNullableString(dto.processedById),
    processedAt: toNullableString(dto.processedAt),
    kbzTransferRef: toNullableString(dto.kbzTransferRef),
    createdAt: toStringValue(dto.createdAt),
    updatedAt: toStringValue(dto.updatedAt),
  };
}

function toAdminNoteString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    const raw = (value as Record<string, unknown>).message;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  return null;
}

export function toFacebookFollowSubmission(
  dto: FacebookFollowSubmissionDto | null | undefined,
): FacebookFollowSubmission | null {
  if (!dto) return null;
  const rawStatus = toStringValue(dto.status, "PENDING").toUpperCase();
  return {
    id: toStringValue(dto.id),
    userId: toStringValue(dto.userId),
    userNickname: toStringValue(dto.userNickname),
    userPhone: toStringValue(dto.userPhone),
    facebookName: toStringValue(dto.facebookName),
    facebookProfileUrl: toStringValue(dto.facebookProfileUrl),
    facebookPageUrl: toStringValue(dto.facebookPageUrl),
    screenshotUrl: toAbsoluteMediaUrl(toStringValue(dto.screenshotUrl)),
    status: rawStatus || "PENDING",
    adminNote: toAdminNoteString(dto.adminNote),
    reviewedById: toNullableString(dto.reviewedById),
    reviewedAt: toNullableString(dto.reviewedAt),
    createdAt: toStringValue(dto.createdAt),
    updatedAt: toStringValue(dto.updatedAt),
  };
}
