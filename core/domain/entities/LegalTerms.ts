export interface LegalTerms {
  version: string;
  title: string;
  content: string;
  publishedAt: string | null;
}

export interface LegalTermsStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
}
