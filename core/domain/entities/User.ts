import type { Id } from "@/core/domain/types";
import type { UserRole } from "@/core/domain/types/auth";

export interface AuthUser {
  id: Id;
  email: string;
  name: string | null;
  role: UserRole;
  accessToken: string;
}
