/**
 * Timezone-aware date helpers using native Intl API.
 * No external libraries required.
 */

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

/**
 * Returns the UTC offset in minutes for a given IANA timezone at a specific moment.
 * Example: Argentina (UTC-3) → -180
 */
export function getOffsetMinutes(date: Date, tz: string): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
}

/**
 * Returns { year, month (1-indexed), day, hour } as seen in the given IANA timezone.
 * Example: getNowInTimezone('America/Argentina/Buenos_Aires')
 *   when UTC is 2026-03-24 10:00 → { year: 2026, month: 3, day: 24, hour: 7 }
 */
export function getNowInTimezone(tz: string = DEFAULT_TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  };
}

/**
 * Total days in a given month. Month is 1-indexed (1=January).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Converts "midnight local in a given timezone" → its UTC equivalent.
 *
 * Example: localMidnightToUTC(2026, 5, 1, 'America/Argentina/Buenos_Aires')
 *   → 2026-05-01 00:00 ARG = 2026-05-01 03:00 UTC
 */
export function localMidnightToUTC(
  year: number,
  month: number,
  day: number,
  tz: string = DEFAULT_TZ,
): Date {
  // 1. Create a rough UTC guess at midnight
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  // 2. Get the offset of the TZ at that approximate moment
  const offsetMs = getOffsetMinutes(guess, tz) * 60000;

  // 3. Subtract the offset to go from local midnight to UTC
  //    Argentina: offset = -180min → UTC = 00:00 - (-180min) = 03:00 UTC
  return new Date(guess.getTime() - offsetMs);
}

/**
 * Returns a UTC Date representing "day 1 of next month at 00:00" in the church's timezone.
 */
export function getFirstOfNextMonthUTC(tz: string = DEFAULT_TZ): Date {
  const { year, month } = getNowInTimezone(tz);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return localMidnightToUTC(nextYear, nextMonth, 1, tz);
}

/**
 * Returns a UTC Date representing the START of day 1 of the current month in the church's timezone.
 */
export function getStartOfMonthUTC(tz: string = DEFAULT_TZ): Date {
  const { year, month } = getNowInTimezone(tz);
  return localMidnightToUTC(year, month, 1, tz);
}

/**
 * Returns a UTC Date representing "day 10 at 23:59:59" (end of grace period) in the church's timezone.
 * Calculated as midnight of day 11 minus 1 second.
 */
export function getGracePeriodEndUTC(
  year: number,
  month: number,
  tz: string = DEFAULT_TZ,
): Date {
  const day11Midnight = localMidnightToUTC(year, month, 11, tz);
  return new Date(day11Midnight.getTime() - 1000); // 1 second before midnight day 11
}
