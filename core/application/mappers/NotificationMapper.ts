import type { ClientNotificationDto } from "@/core/application/dtos/NotificationDto";
import type { ClientNotification } from "@/core/domain/entities/Notification";

/** API may send camelCase or snake_case (e.g. Nest / Prisma JSON). */
function asRecord(dto: ClientNotificationDto): Record<string, unknown> {
  return dto && typeof dto === "object" ? (dto as Record<string, unknown>) : {};
}

function pickUnknown(
  dto: ClientNotificationDto,
  camel: keyof ClientNotificationDto,
  snake: string,
): unknown {
  const fromCamel = dto[camel];
  if (fromCamel !== undefined && fromCamel !== null) return fromCamel;
  return asRecord(dto)[snake];
}

function pickString(
  dto: ClientNotificationDto,
  camel: keyof ClientNotificationDto,
  snake: string,
): string {
  const v = pickUnknown(dto, camel, snake);
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function pickBoolean(
  dto: ClientNotificationDto,
  camel: keyof ClientNotificationDto,
  snake: string,
): boolean {
  const v = pickUnknown(dto, camel, snake);
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  return false;
}

/**
 * Resolves event key from string, number, or common object shapes (bad OpenAPI / serializers).
 */
function coerceEventKey(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const k of [
      "code",
      "key",
      "name",
      "value",
      "eventKey",
      "event_key",
      "type",
    ]) {
      const inner = o[k];
      if (typeof inner === "string" && inner.trim()) return inner.trim();
    }
  }
  return null;
}

function readMetadataEventKey(
  metadata: ClientNotification["metadata"],
): string | null {
  if (
    metadata == null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  )
    return null;
  const m = metadata as Record<string, unknown>;
  return (
    coerceEventKey(m.eventKey) ??
    coerceEventKey(m.event_key) ??
    coerceEventKey(m.code) ??
    null
  );
}

/** If `type` duplicates the server enum (eventKey missing), use it for i18n. */
function inferEventKeyFromType(type: string): string | null {
  const t = type.trim();
  if (!t) return null;
  if (!t.endsWith("_CLIENT")) return null;
  if (
    t.startsWith("KBZPAY_") ||
    t.startsWith("POINTS_") ||
    t.startsWith("FACEBOOK_")
  ) {
    return t;
  }
  return null;
}

function resolveEventKey(
  dto: ClientNotificationDto,
  metadata: ClientNotification["metadata"],
): string | null {
  const fromRoot = coerceEventKey(pickUnknown(dto, "eventKey", "event_key"));
  if (fromRoot) return fromRoot;

  const fromMeta = readMetadataEventKey(metadata);
  if (fromMeta) return fromMeta;

  return inferEventKeyFromType(pickString(dto, "type", "type"));
}

export function toClientNotification(
  dto: ClientNotificationDto,
): ClientNotification {
  const r = asRecord(dto);
  const metadata = (dto.metadata ??
    r.metadata ??
    null) as ClientNotification["metadata"];

  return {
    id: pickString(dto, "id", "id"),
    title: pickString(dto, "title", "title"),
    message: pickString(dto, "message", "message"),
    type: pickString(dto, "type", "type"),
    eventKey: resolveEventKey(dto, metadata),
    metadata,
    isRead: pickBoolean(dto, "isRead", "is_read"),
    referenceId: pickUnknown(dto, "referenceId", "reference_id") ?? null,
    createdAt: pickString(dto, "createdAt", "created_at"),
  };
}
