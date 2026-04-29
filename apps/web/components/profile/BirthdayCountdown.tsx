'use client';

import { daysUntilBirthday, formatBirthday } from '@/lib/birthday';

interface BirthdayCountdownProps {
  birthday: string; // MM-DD or YYYY-MM-DD
  timezone: string;
  locale?: string;
}

export function BirthdayCountdown({
  birthday,
  timezone,
  locale = 'pt-BR',
}: BirthdayCountdownProps) {
  const days = daysUntilBirthday(birthday, timezone);
  const formattedDate = formatBirthday(birthday, locale);

  if (days === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-4">
        <span className="text-4xl" role="img" aria-label="bolo de aniversário">
          🎂
        </span>
        <p className="text-xl font-bold text-pink-600">Hoje é seu aniversário!</p>
        <p className="text-sm text-gray-500">{formattedDate}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold tabular-nums">{days}</span>
        <span className="text-lg text-gray-600">{days === 1 ? 'dia' : 'dias'}</span>
      </div>
      <p className="text-sm text-gray-500">até o próximo aniversário</p>
      <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
    </div>
  );
}

export function BirthdayCountdownHidden() {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <span className="text-4xl" role="img" aria-label="bolo de aniversário">
        🎂
      </span>
      <p className="text-sm text-gray-500">Aniversário em breve</p>
    </div>
  );
}
