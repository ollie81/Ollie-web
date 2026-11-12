import { forwardRef, useId, useImperativeHandle, useRef } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  CalendarDate,
  DobField,
  DobInput,
  DobResult,
  MIN_SIGNUP_AGE_YEARS,
  digitsOnly,
  toIsoDate,
  typedCalendarDate,
} from '../lib/dateOfBirth';
import './DateOfBirthFields.css';

// Three plain number boxes -- Day, Month, Year -- instead of a
// calendar or wheel. Each box is labelled, the hint shows an
// example, and once the numbers make a real date it's read back in
// words ("That's 27 March 2007"), so a swapped day and month is
// caught before submitting. The same layout and rules as the
// Android app (lib/widgets/date_of_birth_fields.dart).

export interface DateOfBirthFieldsHandle {
  focus: (field: DobField) => void;
}

interface Props {
  value: DobInput;
  onChange: (next: DobInput) => void;
  invalidFields: DobField[];
  // Shown under the boxes, in place of the read-back.
  error?: string | null;
  disabled?: boolean;
}

const PARTS: { key: DobField; maxLength: number; autoComplete: string }[] = [
  { key: 'day', maxLength: 2, autoComplete: 'bday-day' },
  { key: 'month', maxLength: 2, autoComplete: 'bday-month' },
  { key: 'year', maxLength: 4, autoComplete: 'bday-year' },
];

const DateOfBirthFields = forwardRef<DateOfBirthFieldsHandle, Props>(function DateOfBirthFields(
  { value, onChange, invalidFields, error, disabled },
  ref,
) {
  const { t, i18n } = useTranslation();
  const baseId = useId();
  const inputs = useRef<Record<DobField, HTMLInputElement | null>>({ day: null, month: null, year: null });
  useImperativeHandle(ref, () => ({ focus: (field) => inputs.current[field]?.focus() }), []);

  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const typed = typedCalendarDate(value);

  return (
    <fieldset className="dob" disabled={disabled}>
      <legend className="dob__legend">{t('auth.dob.legend')}</legend>
      <div className="dob__body">
        <p className="dob__hint" id={hintId}>
          {t('auth.dob.hint')}
        </p>
        <div className="dob__row">
          {PARTS.map(({ key, maxLength, autoComplete }) => {
            const invalid = invalidFields.includes(key);
            const inputId = `${baseId}-${key}`;
            return (
              <div className={`dob__part dob__part--${key}`} key={key}>
                <label className="dob__label" htmlFor={inputId}>
                  {t(`auth.dob.${key}`)}
                </label>
                <input
                  ref={(el) => {
                    inputs.current[key] = el;
                  }}
                  id={inputId}
                  className={`field dob__input${invalid ? ' dob__input--invalid' : ''}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={autoComplete}
                  maxLength={maxLength}
                  value={value[key]}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid && error ? `${hintId} ${errorId}` : hintId}
                  onChange={(e) => onChange({ ...value, [key]: digitsOnly(e.target.value, maxLength) })}
                />
              </div>
            );
          })}
        </div>
        {error ? (
          <p className="dob__error" id={errorId} role="alert">
            {error}
          </p>
        ) : (
          <p className="dob__readback" aria-live="polite">
            {typed ? t('auth.dob.readBack', { date: formatLongDate(typed, i18n.language) }) : ' '}
          </p>
        )}
      </div>
    </fieldset>
  );
});

export default DateOfBirthFields;

// The plain-words message for a failed validateDateOfBirth result,
// in the current UI language.
export function describeDobError(
  result: Extract<DobResult, { ok: false }>,
  t: TFunction,
  language: string,
): string {
  switch (result.code) {
    case 'notRealDate':
      return t('auth.dob.errors.notRealDate', {
        month: monthName(result.month ?? 1, language),
        year: result.year,
        days: result.daysInMonth,
      });
    case 'tooYoung':
      return t('auth.dob.errors.tooYoung', { minAge: MIN_SIGNUP_AGE_YEARS });
    default:
      return t(`auth.dob.errors.${result.code}`);
  }
}

// Formatting always goes through UTC on both ends (a UTC-built
// instant formatted with timeZone: 'UTC'), so the words shown are
// the exact numbers typed whatever timezone the browser is in.
function utcInstant(date: CalendarDate): Date {
  const instant = new Date(0);
  instant.setUTCFullYear(date.year, date.month - 1, date.day);
  return instant;
}

// Plain "en" formats US-style ("March 27, 2007"); day-first reads
// in the same order as the boxes, which is how most of Ollie's
// English-speaking users write dates anyway. Browsers without date
// data for a language (Chromium has none for Kinyarwanda) would
// otherwise fall back to that same US style, so they get the
// day-first English form too.
function formattingLocale(language: string): string {
  if (language === 'en') return 'en-GB';
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([language]).length ? language : 'en-GB';
  } catch {
    return 'en-GB';
  }
}

export function formatLongDate(date: CalendarDate, language: string): string {
  try {
    return new Intl.DateTimeFormat(formattingLocale(language), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utcInstant(date));
  } catch {
    return toIsoDate(date);
  }
}

function monthName(month: number, language: string): string {
  try {
    return new Intl.DateTimeFormat(formattingLocale(language), { month: 'long', timeZone: 'UTC' }).format(
      utcInstant({ year: 2000, month, day: 1 }),
    );
  } catch {
    return String(month);
  }
}
