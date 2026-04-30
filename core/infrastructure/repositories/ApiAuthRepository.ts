import type { LoginResponseDto } from "@/core/application/dtos/AuthDto";
import {
  toAuthUser,
  toLoginRequestDto,
  toRegisterRequestDto,
} from "@/core/application/mappers/AuthMapper";
import type { AuthUser } from "@/core/domain/entities/User";
import type {
  IAuthRepository,
  UnauthorizedHandler,
} from "@/core/domain/repositories/IAuthRepository";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import { TokenStorage } from "../storage/TokenStorage";

export class ApiAuthRepository implements IAuthRepository {
  constructor(private readonly http: HttpClient) {}

  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    const body = toLoginRequestDto(credentials);
    const data = await this.http.post<LoginResponseDto>(
      API_ENDPOINTS.AUTH.LOGIN,
      body,
    );
    const user = toAuthUser(
      data,
      credentials.mode === "phone" ? credentials.phone : credentials.facebookId,
    );
    if (user?.accessToken) {
      await TokenStorage.setAccessToken(user.accessToken);
    }
    return user;
  }

  async register(data: RegisterData | RegisterInput): Promise<AuthUser | null> {
    const body = toRegisterRequestDto(data);
    const res = await this.http.post<LoginResponseDto>(
      API_ENDPOINTS.AUTH.REGISTER,
      body,
    );
    const user = toAuthUser(res, body.email);
    if (user?.accessToken) {
      await TokenStorage.setAccessToken(user.accessToken);
    }
    return user;
  }

  async getProfile(): Promise<AuthUser | null> {
    try {
      const data = await this.http.get<LoginResponseDto>(
        API_ENDPOINTS.AUTH.PROFILE,
      );
      const accessToken = await TokenStorage.getAccessToken();
      return toAuthUser(data, undefined, accessToken ?? undefined);
    } catch {
      return null;
    }
  }

  hasToken(): Promise<boolean> {
    return TokenStorage.hasToken();
  }

  clearTokens(): Promise<void> {
    return TokenStorage.clearTokens();
  }

  onUnauthorized(handler: UnauthorizedHandler): void {
    this.http.setOnUnauthorized(handler);
  }

  async sendPhoneOtp(phone: string): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.OTP_SEND, { phone });
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.OTP_VERIFY, { phone, code });
  }

  async sendEmailVerification(email: string): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.EMAIL_SEND, { email });
  }

  async verifyEmail(email: string, token: string): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.EMAIL_VERIFY, { email, token });
  }

  async requestKbzPayVerification(message: string): Promise<void> {
    await this.http.post(API_ENDPOINTS.AUTH.KBZPAY_REQUEST, { message });
  }
}
