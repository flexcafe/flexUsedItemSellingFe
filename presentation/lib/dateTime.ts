/** Calendar date as `YYYY-MM-DD`. */
export type DateString = string;

/** 24-hour time as `HH:mm`. */
export type TimeString = string;

export function defaultDateString(): DateString {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultTimeString(roundMinutes = 15): TimeString {
  const d = new Date();
  const minutes = d.getMinutes();
  const rounded = Math.ceil(minutes / roundMinutes) * roundMinutes;
  const hh = `${d.getHours() + (rounded >= 60 ? 1 : 0)}`.padStart(2, "0");
  const mm = `${rounded % 60}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateFromDate(date: Date): DateString {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTimeFromDate(date: Date): TimeString {
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Mask while typing → `YYYY-MM-DD`. */
export function formatDateInputMask(raw: string): DateString {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Mask while typing → `HH:mm` (24h). */
export function formatTimeInputMask(raw: string): TimeString {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidCalendarDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

export function isValidTime24h(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hh, mm] = time.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function parseDateString(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!isValidCalendarDate(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function parseTimeString(
  hhmm: string,
  baseDate: Date = new Date(),
): Date | null {
  const trimmed = hhmm.trim();
  if (!isValidTime24h(trimmed)) return null;
  const [hh, mm] = trimmed.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function dateTimeValueToDate(
  dateStr: string,
  timeStr: string,
): Date | null {
  const base = parseDateString(dateStr);
  if (!base) return null;
  return parseTimeString(timeStr, base);
}
