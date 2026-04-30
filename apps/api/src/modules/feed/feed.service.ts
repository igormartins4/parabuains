import { DateTime } from 'luxon';
import type { BirthdayCandidate } from './feed.repository.js';

export interface BirthdayEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  nextBirthday: string; // ISO date "YYYY-MM-DD" no timezone do viewer
  daysUntil: number;
  birthMonthDay: string; // "MM-DD" para exibição (sem ano)
  birthYear?: number; // presente apenas se birthYearHidden = false
}

export interface BirthdayFeed {
  today: BirthdayEntry[];
  upcoming: BirthdayEntry[];
}

export class FeedService {
  constructor(
    private readonly repo: {
      getBirthdayCandidates(userId: string): Promise<BirthdayCandidate[]>;
    },
  ) {}

  async getBirthdayFeed(userId: string, viewerTimezone: string): Promise<BirthdayFeed> {
    const candidates = await this.repo.getBirthdayCandidates(userId);
    const now = DateTime.now().setZone(viewerTimezone);

    const today: BirthdayEntry[] = [];
    const upcoming: BirthdayEntry[] = [];

    for (const candidate of candidates) {
      const entry = this.buildBirthdayEntry(candidate, now);
      if (!entry) continue;

      if (entry.daysUntil === 0) {
        today.push(entry);
      } else if (entry.daysUntil <= 30) {
        upcoming.push(entry);
      }
      // daysUntil > 30: descartar (era candidato extra da janela de 33 dias)
    }

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    return { today, upcoming };
  }

  buildBirthdayEntry(
    candidate: BirthdayCandidate,
    now: DateTime,
  ): BirthdayEntry | null {
    // Extrair mês e dia do birth_date (formato "YYYY-MM-DD" do PostgreSQL date)
    // birthDate may be a string like "1990-06-15" or a Date object from pg
    const birthDateStr =
      typeof candidate.birthDate === 'object' && candidate.birthDate !== null
        ? (candidate.birthDate as unknown as Date).toISOString().slice(0, 10)
        : String(candidate.birthDate);

    const parts = birthDateStr.split('-');
    const month = parseInt(parts[1]!, 10);
    const day = parseInt(parts[2]!, 10);
    const year = parseInt(parts[0]!, 10);

    // Calcular próximo aniversário no timezone do viewer
    let nextBirthday: DateTime;
    const attempt = DateTime.fromObject(
      { year: now.year, month, day },
      { zone: now.zoneName ?? 'UTC' },
    );

    if (!attempt.isValid) {
      // 29 de fevereiro em ano não-bissexto — tratar como 1º de março
      const fallback = DateTime.fromObject(
        { year: now.year, month: 3, day: 1 },
        { zone: now.zoneName ?? 'UTC' },
      );
      if (!fallback.isValid) return null;
      nextBirthday = fallback;
    } else {
      nextBirthday = attempt;
    }

    // Se já passou neste ano, usar o próximo ano
    if (nextBirthday.startOf('day') < now.startOf('day')) {
      nextBirthday = nextBirthday.plus({ years: 1 });
    }

    const daysUntil = Math.round(
      nextBirthday.startOf('day').diff(now.startOf('day'), 'days').days,
    );

    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');

    return {
      userId: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      avatarUrl: candidate.avatarUrl,
      nextBirthday: nextBirthday.toISODate()!,
      daysUntil,
      birthMonthDay: `${monthStr}-${dayStr}`,
      ...(candidate.birthYearHidden ? {} : { birthYear: year }),
    };
  }
}
