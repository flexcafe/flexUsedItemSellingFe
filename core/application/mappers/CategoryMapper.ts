import type { CategoryDto } from "@/core/application/dtos/CategoryDto";
import type { Category } from "@/core/domain/entities/Category";
import {
  extractAvatarStringFromUnknown,
  pickStringFromRecord,
  toAbsoluteMediaUrl,
} from "@/core/application/mappers/mediaUrl";

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function toIconUrl(icon: unknown): string | null {
  const raw =
    typeof icon === "string"
      ? icon.trim()
      : extractAvatarStringFromUnknown(icon) ||
        (icon != null && typeof icon === "object" && !Array.isArray(icon)
          ? pickStringFromRecord(icon as Record<string, unknown>, [
              "icon",
              "iconUrl",
              "icon_url",
              "url",
              "src",
              "path",
              "href",
            ])
          : "");
  if (!raw) return null;
  return toAbsoluteMediaUrl(raw);
}

function toCategoryNode(dto: CategoryDto): Category | null {
  const id = toStringOrNull(dto.id);
  if (!id) return null;

  const name = toStringOrNull(dto.name) ?? "Category";
  const slug = toStringOrNull(dto.slug) ?? "";
  const sortOrder =
    typeof dto.sortOrder === "number" && Number.isFinite(dto.sortOrder)
      ? dto.sortOrder
      : 0;

  const childrenRaw = Array.isArray(dto.children) ? dto.children : [];
  const children = childrenRaw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      return toCategoryNode(item as CategoryDto);
    })
    .filter((item): item is Category => item != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id,
    name,
    slug,
    iconUrl: toIconUrl(dto.icon),
    sortOrder,
    parentId: toStringOrNull(dto.parentId),
    children,
  };
}

export function toCategoryTree(dtos: CategoryDto[]): Category[] {
  return dtos
    .map(toCategoryNode)
    .filter((item): item is Category => item != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
