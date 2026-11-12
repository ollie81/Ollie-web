// Unit tests for src/lib/dateOfBirth.ts -- run with `npm test`
// (Node's built-in test runner; no extra dependencies).
//
// The rules must give the same answer whatever timezone the browser
// is in. To check that, run the suite under a few TZ settings, e.g.
//   TZ=Pacific/Kiritimati npm test   (UTC+14)
//   TZ=Pacific/Pago_Pago npm test    (UTC-11)

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  MAX_PLAUSIBLE_AGE_YEARS,
  MIN_SIGNUP_AGE_YEARS,
  ageOn,
  daysInMonth,
  digitsOnly,
  toIsoDate,
  typedCalendarDate,
  utcToday,
  validateDateOfBirth,
  type CalendarDate,
  type DobInput,
} from '../src/lib/dateOfBirth.ts';

const TODAY: CalendarDate = { year: 2026, month: 11, day: 12 };

function check(day: string, month: string, year: string, today: CalendarDate = TODAY) {
  return validateDateOfBirth({ day, month, year }, today);
}

function expectOk(input: DobInput, iso: string, today: CalendarDate = TODAY) {
  const result = validateDateOfBirth(input, today);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) assert.equal(result.isoDate, iso);
}

function expectError(day: string, month: string, year: string, code: string, today: CalendarDate = TODAY) {
  const result = check(day, month, year, today);
  assert.equal(result.ok, false, `${day}/${month}/${year} should be rejected`);
  if (!result.ok) assert.equal(result.code, code);
  return result;
}

describe('accepted dates', () => {
  test('a normal date is sent exactly as typed, zero-padded', () => {
    expectOk({ day: '5', month: '3', year: '2007' }, '2007-03-05');
    expectOk({ day: '27', month: '12', year: '1990' }, '1990-12-27');
  });

  test('leading zeros and surrounding spaces are fine', () => {
    expectOk({ day: '05', month: '07', year: '2000' }, '2000-07-05');
    expectOk({ day: ' 5 ', month: ' 7', year: '2000 ' }, '2000-07-05');
  });

  test('turning 13 today is allowed', () => {
    expectOk({ day: '12', month: '11', year: '2013' }, '2013-11-12');
  });

  test('29 February exists in leap years', () => {
    expectOk({ day: '29', month: '2', year: '2000' }, '2000-02-29');
    expectOk({ day: '29', month: '2', year: '2012' }, '2012-02-29');
  });

  test('the maximum plausible age itself is allowed', () => {
    expectOk({ day: '12', month: '11', year: String(TODAY.year - MAX_PLAUSIBLE_AGE_YEARS) }, '1906-11-12');
  });
});

describe('missing parts', () => {
  test('nothing typed asks for the date', () => {
    const result = expectError('', '', '', 'required');
    if (!result.ok) assert.deepEqual(result.fields, ['day', 'month', 'year']);
  });

  test('a missing part is named, and only that box is marked', () => {
    const result = expectError('27', '', '2007', 'incomplete');
    if (!result.ok) assert.deepEqual(result.fields, ['month']);
  });
});

describe('not a real calendar date', () => {
  test('day and month out of range point at the right box', () => {
    for (const day of ['0', '32', '99']) {
      const r = expectError(day, '3', '2007', 'dayRange');
      if (!r.ok) assert.deepEqual(r.fields, ['day']);
    }
    for (const month of ['0', '13']) {
      const r = expectError('5', month, '2007', 'monthRange');
      if (!r.ok) assert.deepEqual(r.fields, ['month']);
    }
  });

  test('a year must have four digits', () => {
    expectError('5', '3', '07', 'yearFormat');
    expectError('5', '3', '207', 'yearFormat');
  });

  test('31 April says how long April is', () => {
    const r = expectError('31', '4', '1990', 'notRealDate');
    if (!r.ok) {
      assert.equal(r.daysInMonth, 30);
      assert.equal(r.month, 4);
      assert.deepEqual(r.fields, ['day', 'month']);
    }
  });

  test('29 February outside a leap year says February has 28 days', () => {
    const r = expectError('29', '2', '2023', 'notRealDate');
    if (!r.ok) assert.equal(r.daysInMonth, 28);
  });

  test('century years are leap years only when divisible by 400', () => {
    assert.equal(daysInMonth(2000, 2), 29);
    assert.equal(daysInMonth(1900, 2), 28);
    assert.equal(daysInMonth(2100, 2), 28);
    assert.equal(daysInMonth(2024, 2), 29);
    assert.equal(daysInMonth(2023, 2), 28);
  });

  test('every month has the right length', () => {
    const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    lengths.forEach((days, i) => assert.equal(daysInMonth(2023, i + 1), days, `month ${i + 1}`));
  });
});

describe('impossible ages', () => {
  test('tomorrow and future years are in the future', () => {
    expectError('13', '11', '2026', 'future');
    expectError('1', '1', '2030', 'future');
  });

  test('older than the maximum plausible age asks to check the year', () => {
    expectError('12', '11', String(TODAY.year - MAX_PLAUSIBLE_AGE_YEARS - 1), 'tooOld');
    expectError('1', '1', '0000', 'tooOld');
  });
});

describe('the age bar', () => {
  test(`one day short of ${MIN_SIGNUP_AGE_YEARS} is too young`, () => {
    expectError('13', '11', '2013', 'tooYoung');
  });

  test('a 29 February birthday only counts from 1 March in non-leap years', () => {
    expectError('29', '2', '2012', 'tooYoung', { year: 2025, month: 2, day: 28 });
    expectOk({ day: '29', month: '2', year: '2012' }, '2012-02-29', { year: 2025, month: 3, day: 1 });
  });

  test('ageOn counts whole years', () => {
    assert.equal(ageOn(TODAY, { year: 2000, month: 11, day: 12 }), 26);
    assert.equal(ageOn(TODAY, { year: 2000, month: 11, day: 13 }), 25);
  });
});

describe('timezones never change the date', () => {
  test('"today" is the UTC date, the same one the server uses', () => {
    // 00:30 on 12 Nov in Kigali (UTC+2) is still 11 Nov in UTC.
    assert.deepEqual(utcToday(new Date('2026-11-12T00:30:00+02:00')), { year: 2026, month: 11, day: 11 });
    // 23:30 on 11 Nov in Sao Paulo (UTC-3) is already 12 Nov in UTC.
    assert.deepEqual(utcToday(new Date('2026-11-11T23:30:00-03:00')), { year: 2026, month: 11, day: 12 });
  });

  test('the date sent is built from the typed numbers, not a Date object', () => {
    // A JS Date at local midnight would serialize as the previous day
    // anywhere east of UTC; the typed numbers must come through intact.
    assert.equal(toIsoDate({ year: 2007, month: 1, day: 1 }), '2007-01-01');
    assert.equal(toIsoDate({ year: 2007, month: 12, day: 31 }), '2007-12-31');
  });
});

describe('input helpers', () => {
  test('digitsOnly keeps digits and cuts to the box length', () => {
    assert.equal(digitsOnly('27/03/2007', 2), '27');
    assert.equal(digitsOnly('a1b2c', 4), '12');
    assert.equal(digitsOnly('2007', 4), '2007');
  });

  test('the read-back only appears for a real, complete date', () => {
    assert.equal(typedCalendarDate({ day: '27', month: '3', year: '' }), null);
    assert.equal(typedCalendarDate({ day: '31', month: '4', year: '2007' }), null);
    assert.equal(typedCalendarDate({ day: '1', month: '1', year: '0012' }), null);
    assert.deepEqual(typedCalendarDate({ day: '27', month: '3', year: '2007' }), { year: 2007, month: 3, day: 27 });
  });
});
