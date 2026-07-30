export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Must be sent exactly as `"DELETE"` to permanently delete the account. */
export const DELETE_ACCOUNT_CONFIRM_TEXT = "DELETE" as const;

export interface DeleteAccountInput {
  currentPassword: string;
  /** Must equal {@link DELETE_ACCOUNT_CONFIRM_TEXT}. */
  confirm: typeof DELETE_ACCOUNT_CONFIRM_TEXT;
}

export interface DeleteAccountResult {
  deleted: boolean;
  deletedAt: string | null;
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
