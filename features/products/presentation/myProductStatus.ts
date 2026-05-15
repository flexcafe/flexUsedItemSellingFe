import type { ProductStatus } from "@/core/domain/types/product";

const PRODUCT_STATUSES: ProductStatus[] = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SOLD",
  "DELETED",
];

export function parseProductStatus(
  raw: string | null | undefined,
  isAvailable: boolean,
): ProductStatus {
  if (raw && PRODUCT_STATUSES.includes(raw as ProductStatus)) {
    return raw as ProductStatus;
  }
  return isAvailable ? "ACTIVE" : "SOLD";
}

export function statusBadgeColors(
  status: ProductStatus,
  scheme: "light" | "dark",
): { backgroundColor: string; color: string } {
  const isDark = scheme === "dark";
  switch (status) {
    case "ACTIVE":
      return {
        backgroundColor: isDark ? "#14532D44" : "#DCFCE7",
        color: isDark ? "#86EFAC" : "#15803D",
      };
    case "DRAFT":
      return {
        backgroundColor: isDark ? "#78350F44" : "#FEF3C7",
        color: isDark ? "#FCD34D" : "#B45309",
      };
    case "SOLD":
      return {
        backgroundColor: isDark ? "#1E3A5F44" : "#DBEAFE",
        color: isDark ? "#93C5FD" : "#1D4ED8",
      };
    case "INACTIVE":
      return {
        backgroundColor: isDark ? "#37415166" : "#F3F4F6",
        color: isDark ? "#D1D5DB" : "#4B5563",
      };
    case "DELETED":
    default:
      return {
        backgroundColor: isDark ? "#7F1D1D44" : "#FEE2E2",
        color: isDark ? "#FCA5A5" : "#B91C1C",
      };
  }
}
