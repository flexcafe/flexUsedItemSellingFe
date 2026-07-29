import type {
  LegalTerms,
  LegalTermsStatus,
} from "@/core/domain/entities/LegalTerms";

export interface ILegalService {
  getTerms(): Promise<LegalTerms>;
  getTermsStatus(): Promise<LegalTermsStatus>;
  acceptTerms(termsVersion: string): Promise<LegalTermsStatus>;
}
