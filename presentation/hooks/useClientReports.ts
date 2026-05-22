import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import type {
  FraudReportInput,
  SuggestionInput,
} from "@/core/domain/types/clientReports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_REPORTS_QUERY_KEY = ["client", "reports"] as const;

export function useMySuggestions() {
  const { clientReportService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  return useQuery({
    queryKey: [...CLIENT_REPORTS_QUERY_KEY, "suggestions"],
    queryFn: () => clientReportService.listMySuggestions(),
    enabled: !isLoading && isAuthenticated,
    retry: false,
  });
}

export function useSubmitSuggestion() {
  const { clientReportService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SuggestionInput) => clientReportService.submitSuggestion(input),
    onSuccess: (created) => {
      qc.setQueryData<ClientSuggestion[] | undefined>(
        [...CLIENT_REPORTS_QUERY_KEY, "suggestions"],
        (prev) => [created, ...(prev ?? [])],
      );
    },
  });
}

export function useMyFraudReports() {
  const { clientReportService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  return useQuery({
    queryKey: [...CLIENT_REPORTS_QUERY_KEY, "fraudReports"],
    queryFn: () => clientReportService.listMyFraudReports(),
    enabled: !isLoading && isAuthenticated,
    retry: false,
  });
}

export function useSubmitFraudReport() {
  const { clientReportService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FraudReportInput) =>
      clientReportService.submitFraudReport(input),
    onSuccess: (created) => {
      qc.setQueryData<ClientFraudReport[] | undefined>(
        [...CLIENT_REPORTS_QUERY_KEY, "fraudReports"],
        (prev) => [created, ...(prev ?? [])],
      );
    },
  });
}
