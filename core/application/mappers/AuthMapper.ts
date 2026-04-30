import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
  UserRole,
} from "@/core/domain/types/auth";
import type {
  AuthProfileDto,
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
} from "../dtos/AuthDto";

export function toLoginRequestDto(
  credentials: LoginCredentials
): LoginRequestDto {
  if (credentials.mode === "phone") {
    return { phone: credentials.phone, password: credentials.password };
  }
  return { facebookId: credentials.facebookId, password: credentials.password };
}

function normalizeRole(raw: string | null | undefined): UserRole {
  if (raw === "admin") return "admin";
  if (raw === "customer") return "customer";
  return "staff";
}

function getAuthProfile(dto: LoginResponseDto): AuthProfileDto | undefined {
  if (dto.user) return dto.user;
  if (dto.id || dto.email || dto.name || dto.nickname || dto.phone) return dto;
  return undefined;
}

export function toAuthUser(
  dto: LoginResponseDto,
  fallbackEmail?: string,
  fallbackAccessToken?: string
): AuthUser | null {
  const token =
    dto.access_token ??
    dto.token ??
    dto.accessToken ??
    dto.tokens?.access_token ??
    dto.tokens?.token ??
    dto.tokens?.accessToken ??
    fallbackAccessToken;
  if (!token) return null;

  const user = getAuthProfile(dto);
  return {
    id: user?.id ?? "",
    email: user?.email ?? fallbackEmail ?? "",
    name: user?.name ?? user?.nickname ?? null,
    role: normalizeRole(user?.role),
    accessToken: token,
  };
}

export function toRegisterRequestDto(
  data: RegisterData | RegisterInput
): RegisterRequestDto {
  if ("registrationType" in data) {
    return {
      registrationType: data.registrationType,
      nickname: data.nickname,
      phone: data.phone,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      ...(data.facebookId && data.facebookId.length > 0
        ? { facebookId: data.facebookId }
        : {}),
      kbzPayName: data.kbzPayName,
      kbzPayPhoneNumber: data.kbzPayPhoneNumber,
      gender: data.gender,
      age: data.age,
      maritalStatus: data.maritalStatus,
      region: data.region,
      gpsLatitude: data.gpsLatitude,
      gpsLongitude: data.gpsLongitude,
      ...(data.referralId && data.referralId.length > 0
        ? { referralId: data.referralId }
        : {}),
    };
  }

  throw new Error(
    "RegisterData is missing fields required by the backend registration API"
  );
}
