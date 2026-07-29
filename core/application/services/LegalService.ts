import type {
  LegalTerms,
  LegalTermsStatus,
} from "@/core/domain/entities/LegalTerms";
import type { ILegalRepository } from "@/core/domain/repositories/ILegalRepository";
import type { ILegalService } from "@/core/domain/services/ILegalService";

export class LegalService implements ILegalService {
  constructor(private readonly repo: ILegalRepository) {}

  getTerms(): Promise<LegalTerms> {
    return this.repo.getTerms();
  }

  getTermsStatus(): Promise<LegalTermsStatus> {
    return this.repo.getTermsStatus();
  }

  acceptTerms(termsVersion: string): Promise<LegalTermsStatus> {
    return this.repo.acceptTerms(termsVersion);
  }
}
