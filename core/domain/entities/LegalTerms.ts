export interface LegalTermsMetadata {
  version: string;
}

export interface LegalTerms {
  version: string;
  titleKey: string | null;
  title: string;
  contentKey: string | null;
  content: string;
  metadata: LegalTermsMetadata;
  publishedAt: string | null;
}

export interface LegalTermsStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
}
