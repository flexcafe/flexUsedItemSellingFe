import type {
  ClientFraudReportDto,
  ClientSuggestionDto,
} from "@/core/application/dtos/ClientReportDto";
import {
  toClientFraudReport,
  toClientSuggestion,
} from "@/core/application/mappers/ClientReportMapper";
import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import type { IClientReportRepository } from "@/core/domain/repositories/IClientReportRepository";
import type {
  FraudReportInput,
  SuggestionInput,
} from "@/core/domain/types/clientReports";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res != null && typeof res === "object") {
    const row = res as Record<string, unknown>;
    const direct = row.data;
    if (Array.isArray(direct)) return direct as T[];
    if (direct != null && typeof direct === "object" && !Array.isArray(direct)) {
      const inner = direct as Record<string, unknown>;
      for (const key of ["items", "list", "rows"]) {
        const value = inner[key];
        if (Array.isArray(value)) return value as T[];
      }
    }
  }
  return [];
}

function extractObject<T extends object>(res: unknown): T {
  if (res != null && typeof res === "object" && !Array.isArray(res)) {
    return res as T;
  }
  return {} as T;
}

export class ApiClientReportRepository implements IClientReportRepository {
  constructor(private readonly http: HttpClient) {}

  async submitSuggestion(input: SuggestionInput): Promise<ClientSuggestion> {
    const dto = await this.http.post<ClientSuggestionDto>(
      API_ENDPOINTS.CLIENT_REPORTS.SUGGESTIONS,
      input,
    );
    return toClientSuggestion(extractObject<ClientSuggestionDto>(dto));
  }

  async listMySuggestions(): Promise<ClientSuggestion[]> {
    const res = await this.http.get<unknown>(API_ENDPOINTS.CLIENT_REPORTS.MY_SUGGESTIONS);
    return extractArray<ClientSuggestionDto>(res).map(toClientSuggestion);
  }

  async submitFraudReport(input: FraudReportInput): Promise<ClientFraudReport> {
    const dto = await this.http.post<ClientFraudReportDto>(
      API_ENDPOINTS.CLIENT_REPORTS.FRAUD_REPORTS,
      input,
    );
    return toClientFraudReport(extractObject<ClientFraudReportDto>(dto));
  }

  async listMyFraudReports(): Promise<ClientFraudReport[]> {
    const res = await this.http.get<unknown>(
      API_ENDPOINTS.CLIENT_REPORTS.MY_FRAUD_REPORTS,
    );
    return extractArray<ClientFraudReportDto>(res).map(toClientFraudReport);
  }
}
