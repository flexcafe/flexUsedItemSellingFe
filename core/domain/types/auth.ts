export type UserRole = "admin" | "staff" | "customer";

export type LoginCredentials =
  | { mode: "phone"; phone: string; password: string }
  | { mode: "facebook"; facebookId: string; password: string };

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}
