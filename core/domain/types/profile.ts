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

export interface FacebookLinkInput {
  facebookAccessToken: string;
  facebookProfileUrl: string;
}

export type FacebookFollowSubmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | string;

export interface FacebookFollowSubmission {
  id: string;
  userId: string;
  userNickname: string;
  userPhone: string;
  facebookName: string;
  facebookProfileUrl: string;
  facebookPageUrl: string;
  screenshotUrl: string;
  status: FacebookFollowSubmissionStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookFollowSubmissionInput {
  facebookName: string;
  facebookProfileUrl: string;
  facebookPageUrl: string;
  screenshot: UploadFile;
}
