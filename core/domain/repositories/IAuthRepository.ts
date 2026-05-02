import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { VerificationActionResult } from "@/core/domain/types/verification";

export type UnauthorizedHandler = () => void;

export interface IAuthRepository {
  login(credentials: LoginCredentials): Promise<AuthUser | null>;
  register(data: RegisterData | RegisterInput): Promise<VerificationActionResult>;
  getProfile(): Promise<AuthUser | null>;
  hasToken(): Promise<boolean>;
  clearTokens(): Promise<void>;
  onUnauthorized(handler: UnauthorizedHandler): void;

  sendPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string): Promise<void>;

  sendEmailVerification(email: string): Promise<void>;
  verifyEmail(email: string, token: string): Promise<void>;

  requestKbzPayVerification(message: string): Promise<void>;
}
