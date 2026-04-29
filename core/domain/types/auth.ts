export type UserRole = "admin" | "staff" | "customer";

export type LoginCredentials =
  | { mode: "phone"; phone: string; password: string }
  | { mode: "facebook"; facebookId: string; password: string };

export type RegistrationType = "PHONE_AND_FACEBOOK" | "PHONE_ONLY";
export type Gender = "MALE" | "FEMALE";
export type MaritalStatus = "SINGLE" | "MARRIED";

export interface RegisterInput {
  registrationType: RegistrationType;
  nickname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  facebookId?: string;
  kbzPayName: string;
  kbzPayPhoneNumber: string;
  gender: Gender;
  age: number;
  maritalStatus: MaritalStatus;
  region: string;
  gpsLatitude: number;
  gpsLongitude: number;
  referralId?: string;
}

/**
 * Legacy shape kept for backward compatibility; most call-sites should
 * prefer {@link RegisterInput}.
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}
