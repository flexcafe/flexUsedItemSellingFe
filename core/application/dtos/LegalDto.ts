export interface LegalTermsMetadataDto {
  version?: string | null;
}

export interface LegalTermsDto {
  version?: string | null;
  titleKey?: string | null;
  title?: string | null;
  contentKey?: string | null;
  content?: string | null;
  metadata?: LegalTermsMetadataDto | null;
  publishedAt?: string | null;
}

export interface LegalTermsStatusDto {
  currentVersion?: string | null;
  acceptedVersion?: string | number | null;
  acceptedAt?: string | null;
  needsAcceptance?: boolean | null;
}

export interface AcceptTermsRequestDto {
  termsVersion: string;
}
