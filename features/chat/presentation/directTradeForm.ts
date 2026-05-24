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
  | "chatMeetingTimeInvalid";

export type DirectTradeFormValues = {
  meetingDate: string;
  meetingTime: string;
};

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

  return {
    payload: {
      meetingDate,
      meetingTime,
    },
  };
}
