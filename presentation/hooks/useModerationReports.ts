import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CONTENT_REPORTS_QUERY_KEY = ["client", "moderation", "reports"] as const;

export function useMyContentReports() {
  const { moderationService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  return useQuery({
    queryKey: [...CONTENT_REPORTS_QUERY_KEY, "mine"],
    queryFn: () => moderationService.listMyContentReports(),
    enabled: !isLoading && isAuthenticated,
    retry: false,
  });
}

export function useSubmitContentReport() {
  const { moderationService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContentReportInput) =>
      moderationService.submitContentReport(input),
    onSuccess: (created) => {
      qc.setQueryData<ContentReport[] | undefined>(
        [...CONTENT_REPORTS_QUERY_KEY, "mine"],
        (prev) => [created, ...(prev ?? [])],
      );
    },
  });
}
