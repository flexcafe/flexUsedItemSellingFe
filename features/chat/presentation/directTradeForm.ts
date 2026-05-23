import type { DirectTradeRequestInput } from "@/core/domain/types/chat";
import {
  isValidCalendarDate,
  isValidTime24h,
} from "@/presentation/lib/dateTime";

export type {
  DateString,
  TimeString,
} from "@/presentation/lib/dateTime";

export {
  defaultDateString as defaultMeetingDateString,
  defaultTimeString as defaultMeetingTimeString,
  formatDateInputMask as formatMeetingDateInput,
  formatTimeInputMask as formatMeetingTimeInput,
} from "@/presentation/lib/dateTime";

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

function parseOptionalCoordinate(raw: string): number | undefined {
  const v = raw.trim().replace(",", ".");
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function buildDirectTradeRequest(
  values: DirectTradeFormValues,
):
  | { payload: DirectTradeRequestInput }
  | { errorKey: DirectTradeFormErrorKey } {
  const meetingDate = values.meetingDate.trim();
  const meetingTime = values.meetingTime.trim();

  if (!isValidCalendarDate(meetingDate)) {
    return { errorKey: "chatMeetingDateInvalid" };
  }

  if (!isValidTime24h(meetingTime)) {
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
