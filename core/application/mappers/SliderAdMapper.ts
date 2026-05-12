import type { SliderAdDto } from "@/core/application/dtos/SliderAdDto";
import type { SliderAd } from "@/core/domain/entities/SliderAd";
import {
  pickStringFromRecord,
  toAbsoluteMediaUrl,
} from "@/core/application/mappers/mediaUrl";

function parseLinkUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const s = pickStringFromRecord(o, [
      "url",
      "href",
      "link",
      "targetUrl",
      "target_url",
      "linkUrl",
      "link_url",
    ]);
    return s || null;
  }
  return null;
}

export function toSliderAd(dto: SliderAdDto): SliderAd | null {
  const id = typeof dto.id === "string" && dto.id.trim() ? dto.id.trim() : "";
  const rawImage =
    typeof dto.imageUrl === "string" && dto.imageUrl.trim()
      ? dto.imageUrl.trim()
      : "";
  if (!id || !rawImage) return null;

  const title =
    typeof dto.title === "string" && dto.title.trim()
      ? dto.title.trim()
      : "Promo";

  const imageUrl = toAbsoluteMediaUrl(rawImage);
  const sortOrder =
    typeof dto.sortOrder === "number" && Number.isFinite(dto.sortOrder)
      ? dto.sortOrder
      : 0;

  return {
    id,
    title,
    imageUrl,
    linkUrl: parseLinkUrl(dto.linkUrl),
    sortOrder,
  };
}
