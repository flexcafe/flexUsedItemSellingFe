export interface LoginRequestDto {
  phone?: string;
  facebookId?: string;
  password: string;
}

export interface LoginResponseDto {
  access_token?: string;
  token?: string;
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    role?: string;
  };
}

export interface RegisterRequestDto {
  registrationType: "PHONE_AND_FACEBOOK" | "PHONE_ONLY";
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
  gpsLatitude?: number;
  gpsLongitude?: number;
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
  message: string;
}
