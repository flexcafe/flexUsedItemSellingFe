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
import { extractAvatarFromUserPayload, toAbsoluteMediaUrl } from "./mediaUrl";

export function toLoginRequestDto(
  credentials: LoginCredentials,
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

function peelNestedUserEnvelope(
  dto: LoginResponseDto,
): LoginResponseDto | AuthProfileDto {
  const r = dto as unknown as Record<string, unknown>;
  const inner = r.data;
  if (
    inner != null &&
    typeof inner === "object" &&
    !Array.isArray(inner) &&
    ("id" in (inner as object) ||
      "profile" in (inner as object) ||
      "nickname" in (inner as object))
  ) {
    return inner as LoginResponseDto;
  }
  return dto;
}

function getAuthProfile(dto: LoginResponseDto): AuthProfileDto | undefined {
  const peeled = peelNestedUserEnvelope(dto);
  const withUser = peeled as LoginResponseDto;
  if (withUser.user) return withUser.user;
  if (
    peeled.id ||
    peeled.email ||
    peeled.name ||
    peeled.nickname ||
    peeled.phone
  )
    return peeled as AuthProfileDto;
  return undefined;
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function pickDisplayName(user: AuthProfileDto | undefined): string | null {
  if (!user) return null;
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (name) return name;
  const nick =
    typeof user.nickname === "string" ? user.nickname.trim() : "";
  return nick || null;
}

/**
 * Resolves avatar URL from root `avatarUrl`, nested `profile.avatar` (string or object),
 * and common backend field names.
 */
export function resolveAuthAvatarUrl(user: AuthProfileDto | undefined): string | null {
  if (!user) return null;
  const combined = extractAvatarFromUserPayload(user);
  if (!combined) return null;
  const absolute = toAbsoluteMediaUrl(combined);
  return absolute || null;
}

export function toAuthUser(
  dto: LoginResponseDto,
  fallbackEmail?: string,
  fallbackAccessToken?: string,
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
    email: toSafeString(user?.email) || fallbackEmail || "",
    phone: user?.phone ?? "",
    name: pickDisplayName(user),
    avatarUrl: resolveAuthAvatarUrl(user),
    role: normalizeRole(user?.role),
    isPhoneVerified: Boolean(user?.isPhoneVerified),
    isEmailVerified: Boolean(user?.isEmailVerified),
    kbzPayVerificationStatus:
      typeof user?.kbzPay?.status === "string" ? user.kbzPay.status : null,
    isKbzPayVerified: Boolean(user?.kbzPay?.isVerified),
    kbzPayAdminPhoneForTransfer:
      typeof user?.kbzPay?.adminPhoneForTransfer === "string"
        ? user.kbzPay.adminPhoneForTransfer
        : null,
    kbzPayAdminInstructionSentAt:
      typeof user?.kbzPay?.adminInstructionSentAt === "string"
        ? user.kbzPay.adminInstructionSentAt
        : null,
    kbzPayAdminNote:
      typeof user?.kbzPay?.adminNote === "string"
        ? user.kbzPay.adminNote
        : null,
    kbzPayTransactionId:
      typeof user?.kbzPay?.kbzTransactionId === "string"
        ? user.kbzPay.kbzTransactionId
        : typeof user?.kbzPay?.transactionId === "string"
          ? user.kbzPay.transactionId
          : null,
    kbzPayRequestedAt:
      typeof user?.kbzPay?.verifyRequestedAt === "string"
        ? user.kbzPay.verifyRequestedAt
        : typeof user?.kbzPay?.requestedAt === "string"
          ? user.kbzPay.requestedAt
          : null,
    accessToken: token,
  };
}

export function toRegisterRequestDto(
  data: RegisterData | RegisterInput,
): RegisterRequestDto {
  if ("registrationType" in data) {
    return {
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
    "RegisterData is missing fields required by the backend registration API",
  );
}
