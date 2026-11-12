// ============================================================
// Date-of-birth rules for signup -- pure, no React/i18n, so the
// same function backs the form and the unit tests
// (tests/dateOfBirth.test.ts).
// ============================================================
// Mirrors the backend's _validate_date_of_birth (auth.py) and the
// Android app's lib/utils/date_of_birth.dart, which share these
// rules:
// - at least MIN_SIGNUP_AGE_YEARS old, at most MAX_PLAUSIBLE_AGE_YEARS
// - a real calendar date (month lengths, leap years)
// - "today" is the current UTC date, the same one the server
//   uses, so the form never accepts a date the server then rejects
//   (or the other way round) around midnight on a 13th birthday.
//
// Dates are handled as plain year/month/day numbers throughout and
// never parsed through a JavaScript Date: `new Date("2007-03-27")`
// is midnight UTC, which shows as 26 March anywhere west of
// Greenwich, and that kind of silent shift is exactly what this
// avoids. The value sent to the server is built straight from the
// typed numbers.

export const MIN_SIGNUP_AGE_YEARS = 13;
export const MAX_PLAUSIBLE_AGE_YEARS = 120;

export type DobField = 'day' | 'month' | 'year';

export interface DobInput {
  day: string;
  month: string;
  year: string;
}

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export type DobErrorCode =
  | 'required'
  | 'incomplete'
  | 'dayRange'
  | 'monthRange'
  | 'yearFormat'
  | 'notRealDate'
  | 'future'
  | 'tooOld'
  | 'tooYoung';

export type DobResult =
  | { ok: true; isoDate: string; date: CalendarDate }
  | {
      ok: false;
      code: DobErrorCode;
      // Which inputs to mark invalid -- and the first one gets focus.
      fields: DobField[];
      // Only set for 'notRealDate', to say how long that month is.
      daysInMonth?: number;
      month?: number;
      year?: number;
    };

export const EMPTY_DOB: DobInput = { day: '', month: '', year: '' };

export function utcToday(now: Date = new Date()): CalendarDate {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

// Whole years old on `today`. A 29 February birthday counts from
// 1 March in non-leap years -- the stricter of the two readings,
// and the same one the server uses.
export function ageOn(today: CalendarDate, dob: CalendarDate): number {
  const hadBirthdayThisYear =
    today.month > dob.month || (today.month === dob.month && today.day >= dob.day);
  return today.year - dob.year - (hadBirthdayThisYear ? 0 : 1);
}

export function toIsoDate(date: CalendarDate): string {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

// What an input keeps from whatever was typed or pasted: digits
// only, cut to the field's length. Pasting "27/03/2007" into Day
// keeps "27" rather than rejecting the whole paste.
export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function validateDateOfBirth(input: DobInput, today: CalendarDate = utcToday()): DobResult {
  const parts = { day: input.day.trim(), month: input.month.trim(), year: input.year.trim() };
  const missing = (Object.keys(parts) as DobField[]).filter((field) => parts[field] === '');
  if (missing.length === 3) return { ok: false, code: 'required', fields: missing };
  if (missing.length > 0) return { ok: false, code: 'incomplete', fields: missing };

  const isNumber = (s: string) => /^\d+$/.test(s);
  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);

  if (!isNumber(parts.day) || day < 1 || day > 31) return { ok: false, code: 'dayRange', fields: ['day'] };
  if (!isNumber(parts.month) || month < 1 || month > 12) return { ok: false, code: 'monthRange', fields: ['month'] };
  if (!/^\d{4}$/.test(parts.year)) return { ok: false, code: 'yearFormat', fields: ['year'] };

  if (year > today.year) return { ok: false, code: 'future', fields: ['year'] };
  if (year < today.year - MAX_PLAUSIBLE_AGE_YEARS - 1) return { ok: false, code: 'tooOld', fields: ['year'] };

  const monthLength = daysInMonth(year, month);
  if (day > monthLength) {
    return { ok: false, code: 'notRealDate', fields: ['day', 'month'], daysInMonth: monthLength, month, year };
  }

  const date: CalendarDate = { year, month, day };
  if (compare(date, today) > 0) return { ok: false, code: 'future', fields: ['day', 'month', 'year'] };

  const age = ageOn(today, date);
  if (age > MAX_PLAUSIBLE_AGE_YEARS) return { ok: false, code: 'tooOld', fields: ['year'] };
  if (age < MIN_SIGNUP_AGE_YEARS) return { ok: false, code: 'tooYoung', fields: ['year'] };

  return { ok: true, isoDate: toIsoDate(date), date };
}

// The typed date as a real calendar date (ignoring age), or null
// while it's incomplete or impossible. Drives the "That's 27 March
// 2007" read-back under the fields, so a swapped day and month is
// obvious before submitting.
export function typedCalendarDate(input: DobInput): CalendarDate | null {
  const day = Number(input.day);
  const month = Number(input.month);
  const year = Number(input.year);
  if (!/^\d{1,2}$/.test(input.day) || !/^\d{1,2}$/.test(input.month) || !/^\d{4}$/.test(input.year)) return null;
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}
