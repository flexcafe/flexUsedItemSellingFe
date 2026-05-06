import type { Id } from "@/core/domain/types";
import type { UserRole } from "@/core/domain/types/auth";

export interface AuthUser {
  id: Id;
  email: string;
  phone: string;
  name: string | null;
  role: UserRole;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  kbzPayVerificationStatus: string | null;
  isKbzPayVerified: boolean;
  kbzPayAdminPhoneForTransfer: string | null;
  kbzPayAdminNote: string | null;
  kbzPayTransactionId: string | null;
  kbzPayRequestedAt: string | null;
  accessToken: string;
}
