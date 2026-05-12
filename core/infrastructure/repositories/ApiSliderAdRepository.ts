import type { SliderAdDto } from "@/core/application/dtos/SliderAdDto";
import { toSliderAd } from "@/core/application/mappers/SliderAdMapper";
import type { SliderAd } from "@/core/domain/entities/SliderAd";
import type { ISliderAdRepository } from "@/core/domain/repositories/ISliderAdRepository";
import { API_ENDPOINTS } from "../api/constants";
import type { HttpClient } from "../api/HttpClient";

function extractSliderAdList(res: unknown): SliderAdDto[] {
  if (Array.isArray(res)) return res as SliderAdDto[];
  if (res != null && typeof res === "object") {
    const r = res as Record<string, unknown>;
    const direct = r.data;
    if (Array.isArray(direct)) return direct as SliderAdDto[];
    if (
      direct != null &&
      typeof direct === "object" &&
      !Array.isArray(direct)
    ) {
      const inner = direct as Record<string, unknown>;
      for (const k of ["items", "sliders", "ads", "rows", "list"]) {
        const arr = inner[k];
        if (Array.isArray(arr)) return arr as SliderAdDto[];
      }
    }
    for (const k of ["items", "sliders", "ads", "rows"]) {
      const arr = r[k];
      if (Array.isArray(arr)) return arr as SliderAdDto[];
    }
  }
  return [];
}

export class ApiSliderAdRepository implements ISliderAdRepository {
  constructor(private readonly http: HttpClient) {}

  async listActive(): Promise<SliderAd[]> {
    const res = await this.http.get<unknown>(
      API_ENDPOINTS.SLIDER_ADS.LIST,
    );
    const mapped = extractSliderAdList(res)
      .map(toSliderAd)
      .filter((x): x is SliderAd => x != null);
    mapped.sort((a, b) => a.sortOrder - b.sortOrder);
    return mapped;
  }
}
