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

function asMetadataVersion(
  dto: LegalTermsDto | null | undefined,
): string {
  const fromMeta =
    dto?.metadata && typeof dto.metadata === "object"
      ? asTrimmedString(dto.metadata.version)
      : "";
  return fromMeta || asTrimmedString(dto?.version);
}

export function toLegalTerms(dto: LegalTermsDto | null | undefined): LegalTerms {
  const version = asMetadataVersion(dto);
  return {
    version,
    titleKey: asNullableString(dto?.titleKey),
    title: asTrimmedString(dto?.title) || "Terms of Use",
    contentKey: asNullableString(dto?.contentKey),
    content: asTrimmedString(dto?.content),
    metadata: { version },
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
