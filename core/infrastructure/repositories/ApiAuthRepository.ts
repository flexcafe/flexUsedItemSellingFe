import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { LoginResponseDto } from "@/core/application/dtos/AuthDto";
import {
  toAuthUser,
  toLoginRequestDto,
  toRegisterRequestDto,
} from "@/core/application/mappers/AuthMapper";
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
      return toAuthUser(
        data,
        credentials.mode === "phone" ? credentials.phone : credentials.facebookId
      );
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 401) throw err;
      console.error("[ApiAuthRepository.login]", err);
      return null;
    }
  }

  async register(data: RegisterData | RegisterInput): Promise<AuthUser | null> {
    const body = toRegisterRequestDto(data);
    const res = await this.http.post<LoginResponseDto>(
      API_ENDPOINTS.AUTH.REGISTER,
      body
    );
    return toAuthUser(res, body.email);
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
