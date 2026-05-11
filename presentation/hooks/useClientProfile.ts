import type {
  ChangePasswordInput,
  UploadFile,
} from "@/core/domain/types/profile";
import { useMutation } from "@tanstack/react-query";
import { useServices } from "../providers/ServicesProvider";

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
