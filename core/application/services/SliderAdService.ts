import type { SliderAd } from "@/core/domain/entities/SliderAd";
import type { ISliderAdRepository } from "@/core/domain/repositories/ISliderAdRepository";
import type { ISliderAdService } from "@/core/domain/services/ISliderAdService";

export class SliderAdService implements ISliderAdService {
  constructor(private readonly repo: ISliderAdRepository) {}

  listActive(): Promise<SliderAd[]> {
    return this.repo.listActive();
  }
}
