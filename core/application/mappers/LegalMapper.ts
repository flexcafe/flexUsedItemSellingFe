import type {
  LegalTermsDto,
  LegalTermsStatusDto,
} from "@/core/application/dtos/LegalDto";
import type {
  LegalTerms,
  LegalTermsStatus,
} from "@/core/domain/entities/LegalTerms";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function toLegalTerms(dto: LegalTermsDto | null | undefined): LegalTerms {
  return {
    version: asTrimmedString(dto?.version),
    title: asTrimmedString(dto?.title) || "Terms of Use",
    content: asTrimmedString(dto?.content),
    publishedAt: asNullableString(dto?.publishedAt),
  };
}

export function toLegalTermsStatus(
  dto: LegalTermsStatusDto | null | undefined,
): LegalTermsStatus {
  return {
    currentVersion: asTrimmedString(dto?.currentVersion),
    acceptedVersion: asNullableString(dto?.acceptedVersion),
    acceptedAt: asNullableString(dto?.acceptedAt),
    needsAcceptance: Boolean(dto?.needsAcceptance),
  };
}
