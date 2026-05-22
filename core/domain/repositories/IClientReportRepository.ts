import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import type {
  FraudReportInput,
  SuggestionInput,
} from "@/core/domain/types/clientReports";

export interface IClientReportRepository {
  submitSuggestion(input: SuggestionInput): Promise<ClientSuggestion>;
  listMySuggestions(): Promise<ClientSuggestion[]>;
  submitFraudReport(input: FraudReportInput): Promise<ClientFraudReport>;
  listMyFraudReports(): Promise<ClientFraudReport[]>;
}
