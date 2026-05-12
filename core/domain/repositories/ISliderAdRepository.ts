import type { SliderAd } from "@/core/domain/entities/SliderAd";

export interface ISliderAdRepository {
  listActive(): Promise<SliderAd[]>;
}
