export interface LoginRequestDto {
  phone?: string;
  facebookId?: string;
  password: string;
}

export interface AuthProfileDto {
  id?: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  phone?: string;
  role?: string;
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

export interface RegisterRequestDto {
  nickname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
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
  message: string;
}
