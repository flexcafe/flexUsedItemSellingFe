import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";

export class AuthService implements IAuthService {
  constructor(private readonly repo: IAuthRepository) {}

  login(credentials: LoginCredentials): Promise<AuthUser | null> {
    return this.repo.login(credentials);
  }

  register(data: RegisterData | RegisterInput): Promise<AuthUser | null> {
    return this.repo.register(data);
  }

  getProfile(): Promise<AuthUser | null> {
    return this.repo.getProfile();
  }

  sendPhoneOtp(phone: string): Promise<void> {
    return this.repo.sendPhoneOtp(phone);
  }

  verifyPhoneOtp(phone: string, code: string): Promise<void> {
    return this.repo.verifyPhoneOtp(phone, code);
  }

  sendEmailVerification(email: string): Promise<void> {
    return this.repo.sendEmailVerification(email);
  }

  verifyEmail(email: string, token: string): Promise<void> {
    return this.repo.verifyEmail(email, token);
  }

  requestKbzPayVerification(message: string): Promise<void> {
    return this.repo.requestKbzPayVerification(message);
  }
}
