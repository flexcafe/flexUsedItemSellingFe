import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

const PROFILE_REWARDS_KEY = ["profile", "rewards"] as const;
const PROFILE_POINTS_KEY = [...PROFILE_REWARDS_KEY, "points"] as const;
const PROFILE_STATS_KEY = [...PROFILE_REWARDS_KEY, "stats"] as const;
const PROFILE_WITHDRAWALS_KEY = [...PROFILE_REWARDS_KEY, "withdrawals"] as const;

export function useProfilePoints() {
  const { profileService } = useServices();
  return useQuery({
    queryKey: PROFILE_POINTS_KEY,
    queryFn: () => profileService.getPointsSummary(),
  });
}

export function useProfileTransactionStats() {
  const { profileService } = useServices();
  return useQuery({
    queryKey: PROFILE_STATS_KEY,
    queryFn: () => profileService.getTransactionStats(),
  });
}

export function useWithdrawalRequests() {
  const { profileService } = useServices();
  return useQuery({
    queryKey: PROFILE_WITHDRAWALS_KEY,
    queryFn: () => profileService.getWithdrawalRequests(),
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  const { profileService } = useServices();
  return useMutation({
    mutationFn: (amount: number) => profileService.requestWithdrawal(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_POINTS_KEY });
      qc.invalidateQueries({ queryKey: PROFILE_WITHDRAWALS_KEY });
    },
  });
}
