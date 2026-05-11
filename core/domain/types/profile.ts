export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface AvatarUploadResult {
  avatarUrl: string;
}
