import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import type { IClientReportRepository } from "@/core/domain/repositories/IClientReportRepository";
import type { IClientReportService } from "@/core/domain/services/IClientReportService";
import type {
  FraudReportInput,
  SuggestionInput,
} from "@/core/domain/types/clientReports";

export class ClientReportService implements IClientReportService {
  constructor(private readonly repo: IClientReportRepository) {}

  submitSuggestion(input: SuggestionInput): Promise<ClientSuggestion> {
    return this.repo.submitSuggestion(input);
  }

  listMySuggestions(): Promise<ClientSuggestion[]> {
    return this.repo.listMySuggestions();
  }

  submitFraudReport(input: FraudReportInput): Promise<ClientFraudReport> {
    return this.repo.submitFraudReport(input);
  }

  listMyFraudReports(): Promise<ClientFraudReport[]> {
    return this.repo.listMyFraudReports();
  }
}
