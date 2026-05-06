import type {
  ProfilePointsSummary,
  ProfileTransactionStats,
  WithdrawalRequest,
} from "@/core/domain/entities/ProfileRewards";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type {
  ProfilePointsSummaryDto,
  ProfileTransactionStatsDto,
  WithdrawalRequestDto,
} from "@/core/application/dtos/ProfileDto";
import {
  toProfilePointsSummary,
  toProfileTransactionStats,
  toWithdrawalRequest,
} from "@/core/application/mappers/ProfileMapper";
import type { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

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
    const res = await this.http.get<WithdrawalRequestDto[] | { data?: WithdrawalRequestDto[] }>(
      API_ENDPOINTS.PROFILE.WITHDRAWALS,
    );
    const list = Array.isArray(res) ? res : res?.data ?? [];
    return list.map(toWithdrawalRequest);
  }

  async requestWithdrawal(amount: number): Promise<WithdrawalRequest> {
    const dto = await this.http.post<WithdrawalRequestDto>(
      API_ENDPOINTS.PROFILE.WITHDRAWALS,
      { amount },
    );
    return toWithdrawalRequest(dto ?? {});
  }
}
