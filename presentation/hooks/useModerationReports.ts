import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
import type {
  UnblockResult,
  UserBlock,
  UserBlockInput,
} from "@/core/domain/entities/UserBlock";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CLIENT_CHAT_QUERY_KEY } from "@/presentation/hooks/useClientChat";
import { CLIENT_PRODUCTS_QUERY_KEY } from "@/presentation/hooks/useClientProducts";
import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CONTENT_REPORTS_QUERY_KEY = [
  "client",
  "moderation",
  "reports",
] as const;

export const USER_BLOCKS_QUERY_KEY = [
  "client",
  "moderation",
  "blocks",
] as const;

function invalidateAfterBlockChange(
  qc: ReturnType<typeof useQueryClient>,
) {
  void qc.invalidateQueries({ queryKey: [...USER_BLOCKS_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: [...CLIENT_PRODUCTS_QUERY_KEY] });
  void qc.invalidateQueries({ queryKey: ["products"] });
  void qc.invalidateQueries({ queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"] });
}

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

export function useMyBlocks() {
  const { moderationService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  return useQuery({
    queryKey: [...USER_BLOCKS_QUERY_KEY, "list"],
    queryFn: () => moderationService.listMyBlocks(),
    enabled: !isLoading && isAuthenticated,
    retry: false,
  });
}

export function useBlockedUserIds() {
  const { moderationService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  return useQuery({
    queryKey: [...USER_BLOCKS_QUERY_KEY, "ids"],
    queryFn: () => moderationService.listBlockedUserIds(),
    enabled: !isLoading && isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });
}

export function useBlockUser() {
  const { moderationService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserBlockInput) => moderationService.blockUser(input),
    onSuccess: (created) => {
      qc.setQueryData<UserBlock[] | undefined>(
        [...USER_BLOCKS_QUERY_KEY, "list"],
        (prev) => {
          const without = (prev ?? []).filter(
            (row) => row.blockedUserId !== created.blockedUserId,
          );
          return [created, ...without];
        },
      );
      qc.setQueryData<string[] | undefined>(
        [...USER_BLOCKS_QUERY_KEY, "ids"],
        (prev) => {
          const next = new Set(prev ?? []);
          next.add(created.blockedUserId);
          return [...next];
        },
      );
      invalidateAfterBlockChange(qc);
    },
  });
}

export function useUnblockUser() {
  const { moderationService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => moderationService.unblockUser(userId),
    onSuccess: (result: UnblockResult) => {
      qc.setQueryData<UserBlock[] | undefined>(
        [...USER_BLOCKS_QUERY_KEY, "list"],
        (prev) =>
          (prev ?? []).filter(
            (row) => row.blockedUserId !== result.blockedUserId,
          ),
      );
      qc.setQueryData<string[] | undefined>(
        [...USER_BLOCKS_QUERY_KEY, "ids"],
        (prev) =>
          (prev ?? []).filter((id) => id !== result.blockedUserId),
      );
      invalidateAfterBlockChange(qc);
    },
  });
}
