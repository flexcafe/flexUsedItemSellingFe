import type {
  ContentReportDto,
  SubmitContentReportRequestDto,
} from "@/core/application/dtos/ModerationDto";
import { toContentReport } from "@/core/application/mappers/ModerationMapper";
import type {
  ContentReport,
  ContentReportInput,
} from "@/core/domain/entities/ContentReport";
import type { IModerationRepository } from "@/core/domain/repositories/IModerationRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res != null && typeof res === "object") {
    const row = res as Record<string, unknown>;
    const direct = row.data;
    if (Array.isArray(direct)) return direct as T[];
    if (direct != null && typeof direct === "object" && !Array.isArray(direct)) {
      const inner = direct as Record<string, unknown>;
      for (const key of ["items", "list", "rows"]) {
        const value = inner[key];
        if (Array.isArray(value)) return value as T[];
      }
    }
  }
  return [];
}

function extractObject<T extends object>(res: unknown): T {
  if (res != null && typeof res === "object" && !Array.isArray(res)) {
    return res as T;
  }
  return {} as T;
}

export class ApiModerationRepository implements IModerationRepository {
  constructor(private readonly http: HttpClient) {}

  async submitContentReport(input: ContentReportInput): Promise<ContentReport> {
    const body: SubmitContentReportRequestDto = {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
    };
    const details = input.details?.trim();
    if (details) body.details = details;

    const dto = await this.http.post<ContentReportDto>(
      API_ENDPOINTS.MODERATION.REPORTS,
      body,
    );
    return toContentReport(extractObject<ContentReportDto>(dto));
  }

  async listMyContentReports(): Promise<ContentReport[]> {
    const res = await this.http.get<unknown>(API_ENDPOINTS.MODERATION.MY_REPORTS);
    return extractArray<ContentReportDto>(res).map(toContentReport);
  }
}
