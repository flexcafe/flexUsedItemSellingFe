import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
  UserRole,
} from "@/core/domain/types/auth";
import type {
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

function normalizeRole(raw: string | undefined): UserRole {
  if (raw === "admin") return "admin";
  if (raw === "customer") return "customer";
  return "staff";
}

export function toAuthUser(
  dto: LoginResponseDto,
  fallbackEmail?: string
): AuthUser | null {
  const token = dto.access_token ?? dto.token ?? dto.accessToken;
  if (!token) return null;

  const user = dto.user;
  return {
    id: user?.id ?? "",
    email: user?.email ?? fallbackEmail ?? "",
    name: user?.name ?? null,
    role: normalizeRole(user?.role),
    accessToken: token,
  };
}

/**
 * Narrow the legacy {@link RegisterData} or the full {@link RegisterInput}
 * down to the API contract expected by `/api/v1/client/auth/register`.
 */
export function toRegisterRequestDto(
  data: RegisterData | RegisterInput
): RegisterRequestDto {
  if ("registrationType" in data) {
    const dto: RegisterRequestDto = {
      registrationType: data.registrationType,
      nickname: data.nickname,
      phone: data.phone,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      kbzPayName: data.kbzPayName,
      kbzPayPhoneNumber: data.kbzPayPhoneNumber,
      gender: data.gender,
      age: data.age,
      maritalStatus: data.maritalStatus,
      region: data.region,
    };
    if (data.registrationType === "PHONE_AND_FACEBOOK" && data.facebookId) {
      dto.facebookId = data.facebookId;
    }
    if (typeof data.gpsLatitude === "number") dto.gpsLatitude = data.gpsLatitude;
    if (typeof data.gpsLongitude === "number") dto.gpsLongitude = data.gpsLongitude;
    if (data.referralId && data.referralId.length > 0) {
      dto.referralId = data.referralId;
    }
    return dto;
  }

  // Legacy fallback — forced into PHONE_ONLY shape with sentinel values.
  // Call-sites should migrate to `RegisterInput`.
  return {
    registrationType: "PHONE_ONLY",
    nickname: data.name,
    phone: "",
    email: data.email,
    password: data.password,
    confirmPassword: data.password,
    kbzPayName: data.name,
    kbzPayPhoneNumber: "",
    gender: "MALE",
    age: 0,
    maritalStatus: "SINGLE",
    region: "",
  };
}
