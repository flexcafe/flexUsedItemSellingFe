import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { AuthUser } from "@/core/domain/entities/User";
import type { LoginCredentials, RegisterData } from "@/core/domain/types/auth";

export class AuthService implements IAuthService {
  constructor(private readonly repo: IAuthRepository) {}

  login(credentials: LoginCredentials): Promise<AuthUser | null> {
    return this.repo.login(credentials);
  }

  register(data: RegisterData): Promise<void> {
    return this.repo.register(data);
  }

  getProfile(): Promise<AuthUser | null> {
    return this.repo.getProfile();
  }
}
