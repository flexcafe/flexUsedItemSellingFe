export interface LoginRequestDto {
  phone?: string;
  facebookId?: string;
  password: string;
}

/** Nested profile on GET /client/auth/me (and similar) — avatar lives here, not only at root. */
export interface AuthClientProfileDto {
  avatar?: unknown;
  gender?: string | null;
  age?: number | null;
  maritalStatus?: string | null;
  region?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  isRegionVerified?: boolean;
  facebookName?: string | null;
  facebookProfileUrl?: string | null;
  facebookLinkedAt?: string | null;
}

export interface AuthProfileDto {
  id?: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  profile?: AuthClientProfileDto | null;
  phone?: string;
  role?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  kbzPay?: {
    status?: string | null;
    isVerified?: boolean;
    adminPhoneForTransfer?: string | null;
    adminInstructionSentAt?: string | null;
    adminNote?: string | null;
    message?: string | null;
    kbzTransactionId?: string | null;
    transactionId?: string | null;
    requestedAt?: string | null;
    verifyRequestedAt?: string | null;
  } | null;
}

export interface LoginResponseDto extends AuthProfileDto {
  access_token?: string;
  token?: string;
  accessToken?: string;
  tokens?: {
    access_token?: string;
    token?: string;
    accessToken?: string;
  };
  user?: AuthProfileDto;
}

export interface VerificationActionResultDto {
  action: string;
}

export interface RegisterRequestDto {
  nickname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  facebookId?: string;
  kbzPayName: string;
  kbzPayPhoneNumber: string;
  gender: "MALE" | "FEMALE";
  age: number;
  maritalStatus: "SINGLE" | "MARRIED";
  region: string;
  gpsLatitude: number;
  gpsLongitude: number;
  referralId?: string;
}

export interface OtpSendRequestDto {
  phone: string;
}

export interface OtpVerifyRequestDto {
  phone: string;
  code: string;
}

export interface EmailSendRequestDto {
  email: string;
}

export interface EmailVerifyRequestDto {
  email: string;
  token: string;
}

export interface KbzPayVerificationRequestDto {
  message?: string;
}

export interface KbzPaySubmitTransactionRequestDto {
  kbzTransactionId: string;
}
