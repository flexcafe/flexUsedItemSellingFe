import type { AuthUser } from "@/core/domain/entities/User";
import type { LoginCredentials } from "@/core/domain/types/auth";
import type { UserRole } from "@/core/domain/types/auth";
import type { LoginRequestDto, LoginResponseDto } from "../dtos/AuthDto";

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
