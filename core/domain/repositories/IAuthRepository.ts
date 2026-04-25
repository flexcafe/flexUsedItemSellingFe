import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";

export interface IAuthRepository {
  login(credentials: LoginCredentials): Promise<AuthUser | null>;
  register(data: RegisterData | RegisterInput): Promise<AuthUser | null>;
  getProfile(): Promise<AuthUser | null>;

  sendPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string): Promise<void>;

  sendEmailVerification(email: string): Promise<void>;
  verifyEmail(email: string, token: string): Promise<void>;

  requestKbzPayVerification(message: string): Promise<void>;
}
