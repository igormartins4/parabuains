'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { BirthdayEntry } from '@/lib/api/feed';

interface BirthdayCardProps {
  entry: BirthdayEntry;
  isToday?: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function BirthdayCard({ entry, isToday }: BirthdayCardProps) {
  const [monthStr, dayStr] = entry.birthMonthDay.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);
  const dateStr = entry.birthYear
    ? `${day} de ${MONTH_NAMES[month - 1]} de ${entry.birthYear}`
    : `${day} de ${MONTH_NAMES[month - 1]}`;

  return (
    <Link
      href={`/${entry.username}`}
      className={`flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-neutral-50 ${
        isToday
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-white border border-neutral-100'
      }`}
    >
      <div className="relative shrink-0">
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt={entry.displayName}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-semibold text-neutral-600">
            {entry.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {isToday && (
          <span
            className="absolute -bottom-1 -right-1 text-lg"
            aria-label="aniversário hoje"
          >
            🎂
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 truncate">{entry.displayName}</p>
        <p className="text-sm text-neutral-500 truncate">@{entry.username}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-neutral-700">{dateStr}</p>
        <p
          className={`text-xs ${
            isToday ? 'text-amber-600 font-semibold' : 'text-neutral-400'
          }`}
        >
          {isToday
            ? 'Hoje!'
            : `em ${entry.daysUntil} dia${entry.daysUntil === 1 ? '' : 's'}`}
        </p>
      </div>
    </Link>
  );
}
