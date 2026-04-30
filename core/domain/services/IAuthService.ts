import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { UnauthorizedHandler } from "@/core/domain/repositories/IAuthRepository";

export interface IAuthService {
  bootstrap(): Promise<AuthUser | null>;
  login(credentials: LoginCredentials): Promise<AuthUser | null>;
  register(data: RegisterData | RegisterInput): Promise<AuthUser | null>;
  getProfile(): Promise<AuthUser | null>;
  logout(): Promise<void>;
  onUnauthorized(handler: UnauthorizedHandler): void;

  sendPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string): Promise<void>;

  sendEmailVerification(email: string): Promise<void>;
  verifyEmail(email: string, token: string): Promise<void>;

  requestKbzPayVerification(message: string): Promise<void>;
}
