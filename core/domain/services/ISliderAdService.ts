import type { SliderAd } from "@/core/domain/entities/SliderAd";

export interface ISliderAdService {
  listActive(): Promise<SliderAd[]>;
}
