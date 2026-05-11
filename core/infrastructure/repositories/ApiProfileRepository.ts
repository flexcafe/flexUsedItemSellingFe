import type {
  ProfilePointsSummaryDto,
  ProfileTransactionStatsDto,
  WithdrawalRequestDto,
} from "@/core/application/dtos/ProfileDto";
import { toAbsoluteMediaUrl } from "@/core/application/mappers/mediaUrl";
import {
  toProfilePointsSummary,
  toProfileTransactionStats,
  toWithdrawalRequest,
} from "@/core/application/mappers/ProfileMapper";
import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "@/core/domain/entities/ProfileRewards";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type {
  AvatarUploadResult,
  ChangePasswordInput,
  UploadFile,
} from "@/core/domain/types/profile";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

function pickAvatarUrlFromUploadResponse(res: unknown): string {
  if (res == null) return "";
  if (typeof res === "string") return res.trim();
  if (typeof res !== "object" || Array.isArray(res)) return "";
  const r = res as Record<string, unknown>;
  const direct =
    r.avatarUrl ??
    r.avatar_url ??
    r.url ??
    r.fileUrl ??
    r.file_url;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const data = r.data;
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const inner =
      d.avatarUrl ??
      d.avatar_url ??
      d.url ??
      d.profile;
    if (typeof inner === "string" && inner.trim()) return inner.trim();
    if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
      const p = inner as Record<string, unknown>;
      const av = p.avatar ?? p.avatarUrl ?? p.url;
      if (typeof av === "string" && av.trim()) return av.trim();
    }
  }
  return "";
}

export class ApiProfileRepository implements IProfileRepository {
  constructor(private readonly http: HttpClient) {}

  async getPointsSummary(): Promise<ProfilePointsSummary> {
    const dto = await this.http.get<ProfilePointsSummaryDto>(
      API_ENDPOINTS.PROFILE.POINTS,
    );
    return toProfilePointsSummary(dto ?? {});
  }

  async getTransactionStats(): Promise<ProfileTransactionStats> {
    const dto = await this.http.get<ProfileTransactionStatsDto>(
      API_ENDPOINTS.PROFILE.STATS,
    );
    return toProfileTransactionStats(dto ?? {});
  }

  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    const res = await this.http.get<
      WithdrawalRequestDto[] | { data?: WithdrawalRequestDto[] }
    >(API_ENDPOINTS.PROFILE.WITHDRAWALS);
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    return list.map(toWithdrawalRequest);
  }

  async requestWithdrawal(amount: number): Promise<WithdrawalRequest> {
    const dto = await this.http.post<WithdrawalRequestDto>(
      API_ENDPOINTS.PROFILE.WITHDRAWALS,
      { amount },
    );
    return toWithdrawalRequest(dto ?? {});
  }

  async changePassword(input: ChangePasswordInput): Promise<boolean> {
    const res = await this.http.post<boolean>(
      API_ENDPOINTS.PROFILE.CHANGE_PASSWORD,
      input,
    );
    return Boolean(res);
  }

  async uploadAvatar(file: UploadFile): Promise<AvatarUploadResult> {
    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const res = await this.http.post<unknown>(
      API_ENDPOINTS.PROFILE.AVATAR,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const raw = pickAvatarUrlFromUploadResponse(res);
    const avatarUrl = raw ? toAbsoluteMediaUrl(raw) : "";
    return { avatarUrl };
  }
}
