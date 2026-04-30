import { DateTime } from 'luxon';

/**
 * Calculates days until next birthday, accounting for user timezone.
 * Returns 0 if birthday is today.
 * @param birthday - birthday string in MM-DD or YYYY-MM-DD format
 * @param timezone - IANA timezone string e.g. 'America/Sao_Paulo'
 */
export function daysUntilBirthday(birthday: string, timezone: string): number {
  const now = DateTime.now().setZone(timezone);

  // Parse MM-DD or YYYY-MM-DD
  const parts = birthday.split('-');
  let month: number;
  let day: number;

  if (parts.length === 2) {
    // MM-DD format
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    // YYYY-MM-DD format
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  }

  let nextBirthday = DateTime.fromObject({ month, day, year: now.year }, { zone: timezone });

  // If birthday already passed this year, use next year
  if (nextBirthday < now.startOf('day')) {
    nextBirthday = nextBirthday.plus({ years: 1 });
  }

  const diff = nextBirthday.startOf('day').diff(now.startOf('day'), 'days');
  return Math.round(diff.days);
}

/**
 * Formats a birthday for display.
 * @param birthday - MM-DD or YYYY-MM-DD
 * @param locale - BCP 47 locale string e.g. 'pt-BR'
 */
export function formatBirthday(birthday: string, locale = 'pt-BR'): string {
  const parts = birthday.split('-');
  let month: number;
  let day: number;
  let year: number | undefined;

  if (parts.length === 2) {
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  }

  const date = year ? new Date(year, month - 1, day) : new Date(2000, month - 1, day); // placeholder year for formatting

  const options: Intl.DateTimeFormatOptions = year
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'long' };

  return new Intl.DateTimeFormat(locale, options).format(date);
}
