import type {
  ChangePasswordInput,
  FacebookFollowSubmissionInput,
  FacebookLinkInput,
  UploadFile,
} from "@/core/domain/types/profile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

export const FACEBOOK_FOLLOW_SUBMISSION_QUERY_KEY = [
  "client",
  "profile",
  "facebook-follow-submission",
] as const;

export function useChangePassword() {
  const { profileService } = useServices();
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      profileService.changePassword(input),
  });
}

export function useUploadAvatar() {
  const { profileService } = useServices();
  return useMutation({
    mutationFn: (file: UploadFile) => profileService.uploadAvatar(file),
  });
}

export function useLinkFacebookAccount() {
  const { profileService } = useServices();
  return useMutation({
    mutationFn: (input: FacebookLinkInput) =>
      profileService.linkFacebookAccount(input),
  });
}

export function useLatestFacebookFollowSubmission() {
  const { profileService } = useServices();
  return useQuery({
    queryKey: FACEBOOK_FOLLOW_SUBMISSION_QUERY_KEY,
    queryFn: () => profileService.getLatestFacebookFollowSubmission(),
  });
}

export function useSubmitFacebookFollowSubmission() {
  const { profileService } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FacebookFollowSubmissionInput) =>
      profileService.submitFacebookFollowSubmission(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: FACEBOOK_FOLLOW_SUBMISSION_QUERY_KEY,
      });
    },
  });
}
