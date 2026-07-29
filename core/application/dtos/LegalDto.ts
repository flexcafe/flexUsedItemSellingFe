export interface LegalTermsDto {
  version?: string | null;
  title?: string | null;
  content?: string | null;
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
