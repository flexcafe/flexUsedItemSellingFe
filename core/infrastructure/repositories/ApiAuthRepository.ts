import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { AuthUser } from "@/core/domain/entities/User";
import type { LoginCredentials, RegisterData } from "@/core/domain/types/auth";
import type { LoginResponseDto } from "@/core/application/dtos/AuthDto";
import { toLoginRequestDto, toAuthUser } from "@/core/application/mappers/AuthMapper";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

export class ApiAuthRepository implements IAuthRepository {
  constructor(private readonly http: HttpClient) {}

  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    const body = toLoginRequestDto(credentials);
    try {
      const data = await this.http.post<LoginResponseDto>(
        API_ENDPOINTS.AUTH.LOGIN,
        body
      );
      return toAuthUser(data, credentials.email);
    } catch (err) {
      console.error("[ApiAuthRepository.login]", err);
      return null;
    }
  }

  async register(data: RegisterData): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  async getProfile(): Promise<AuthUser | null> {
    try {
      const data = await this.http.get<LoginResponseDto>(
        API_ENDPOINTS.AUTH.PROFILE
      );
      return toAuthUser(data);
    } catch {
      return null;
    }
  }
}
