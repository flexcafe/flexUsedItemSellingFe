import type { AuthUser } from "@/core/domain/entities/User";
import type { UnauthorizedHandler } from "@/core/domain/repositories/IAuthRepository";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { VerificationActionResult } from "@/core/domain/types/verification";

export interface IAuthService {
  bootstrap(): Promise<AuthUser | null>;
  login(credentials: LoginCredentials): Promise<AuthUser | null>;
  register(
    data: RegisterData | RegisterInput,
  ): Promise<VerificationActionResult>;
  getProfile(): Promise<AuthUser | null>;
  logout(): Promise<void>;
  onUnauthorized(handler: UnauthorizedHandler): void;

  sendPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string): Promise<void>;

  sendEmailVerification(email: string): Promise<void>;
  verifyEmail(email: string, token: string): Promise<void>;

  requestKbzPayVerification(message?: string): Promise<void>;
  submitKbzPayTransaction(kbzTransactionId: string): Promise<void>;
}
