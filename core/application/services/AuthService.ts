import type { IAuthService } from "@/core/domain/services/IAuthService";
import type {
  IAuthRepository,
  UnauthorizedHandler,
} from "@/core/domain/repositories/IAuthRepository";
import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { VerificationActionResult } from "@/core/domain/types/verification";

export class AuthService implements IAuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async bootstrap(): Promise<AuthUser | null> {
    const hasToken = await this.repo.hasToken();
    if (!hasToken) return null;
    const user = await this.repo.getProfile();
    if (!user) {
      await this.repo.clearTokens();
    }
    return user;
  }

  login(credentials: LoginCredentials): Promise<AuthUser | null> {
    return this.repo.login(credentials);
  }

  register(data: RegisterData | RegisterInput): Promise<VerificationActionResult> {
    return this.repo.register(data);
  }

  getProfile(): Promise<AuthUser | null> {
    return this.repo.getProfile();
  }

  logout(): Promise<void> {
    return this.repo.clearTokens();
  }

  onUnauthorized(handler: UnauthorizedHandler): void {
    this.repo.onUnauthorized(handler);
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
