import type { DirectTradeRequestInput } from "@/core/domain/types/chat";

export type DirectTradeFormErrorKey =
  | "chatMeetingDateInvalid"
  | "chatMeetingTimeInvalid"
  | "chatMeetingCoordsPairRequired"
  | "chatMeetingCoordsInvalid";

export type DirectTradeFormValues = {
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  meetingLatitude: string;
  meetingLongitude: string;
};

export function defaultMeetingDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultMeetingTimeString(): string {
  const d = new Date();
  const minutes = d.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  const hh = `${d.getHours() + (rounded >= 60 ? 1 : 0)}`.padStart(2, "0");
  const mm = `${rounded % 60}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Mask while typing → `YYYY-MM-DD`. */
export function formatMeetingDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Mask while typing → `HH:mm` (24h). */
export function formatMeetingTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseOptionalCoordinate(raw: string): number | undefined {
  const v = raw.trim().replace(",", ".");
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function isValidCalendarDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

export function buildDirectTradeRequest(
  values: DirectTradeFormValues,
): { payload: DirectTradeRequestInput } | { errorKey: DirectTradeFormErrorKey } {
  const meetingDate = values.meetingDate.trim();
  const meetingTime = values.meetingTime.trim();

  if (!isValidCalendarDate(meetingDate)) {
    return { errorKey: "chatMeetingDateInvalid" };
  }

  if (!/^\d{2}:\d{2}$/.test(meetingTime)) {
    return { errorKey: "chatMeetingTimeInvalid" };
  }

  const [hh, mm] = meetingTime.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return { errorKey: "chatMeetingTimeInvalid" };
  }

  const latRaw = values.meetingLatitude.trim();
  const lngRaw = values.meetingLongitude.trim();
  const hasLat = latRaw.length > 0;
  const hasLng = lngRaw.length > 0;

  if (hasLat !== hasLng) {
    return { errorKey: "chatMeetingCoordsPairRequired" };
  }

  let meetingLatitude: number | undefined;
  let meetingLongitude: number | undefined;

  if (hasLat && hasLng) {
    const lat = parseOptionalCoordinate(latRaw);
    const lng = parseOptionalCoordinate(lngRaw);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat! < -90 ||
      lat! > 90 ||
      lng! < -180 ||
      lng! > 180
    ) {
      return { errorKey: "chatMeetingCoordsInvalid" };
    }
    meetingLatitude = lat;
    meetingLongitude = lng;
  }

  const location = values.meetingLocation.trim();

  return {
    payload: {
      meetingDate,
      meetingTime,
      ...(location ? { meetingLocation: location } : {}),
      ...(meetingLatitude != null && meetingLongitude != null
        ? { meetingLatitude, meetingLongitude }
        : {}),
    },
  };
}
