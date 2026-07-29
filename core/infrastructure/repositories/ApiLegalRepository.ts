import type {
  LegalTermsDto,
  LegalTermsStatusDto,
} from "@/core/application/dtos/LegalDto";
import {
  toLegalTerms,
  toLegalTermsStatus,
} from "@/core/application/mappers/LegalMapper";
import type {
  LegalTerms,
  LegalTermsStatus,
} from "@/core/domain/entities/LegalTerms";
import type { ILegalRepository } from "@/core/domain/repositories/ILegalRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractObject<T extends object>(res: unknown): T {
  if (res != null && typeof res === "object" && !Array.isArray(res)) {
    return res as T;
  }
  return {} as T;
}

export class ApiLegalRepository implements ILegalRepository {
  constructor(private readonly http: HttpClient) {}

  async getTerms(): Promise<LegalTerms> {
    const dto = await this.http.get<LegalTermsDto>(API_ENDPOINTS.LEGAL.TERMS);
    return toLegalTerms(extractObject<LegalTermsDto>(dto));
  }

  async getTermsStatus(): Promise<LegalTermsStatus> {
    const dto = await this.http.get<LegalTermsStatusDto>(
      API_ENDPOINTS.LEGAL.TERMS_STATUS,
    );
    return toLegalTermsStatus(extractObject<LegalTermsStatusDto>(dto));
  }

  async acceptTerms(termsVersion: string): Promise<LegalTermsStatus> {
    const dto = await this.http.post<LegalTermsStatusDto>(
      API_ENDPOINTS.LEGAL.TERMS_ACCEPT,
      { termsVersion },
    );
    return toLegalTermsStatus(extractObject<LegalTermsStatusDto>(dto));
  }
}
