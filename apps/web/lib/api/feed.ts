export interface BirthdayEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  nextBirthday: string;
  daysUntil: number;
  birthMonthDay: string;
  birthYear?: number;
}

export interface BirthdayFeed {
  today: BirthdayEntry[];
  upcoming: BirthdayEntry[];
}

export async function getBirthdayFeed(): Promise<BirthdayFeed> {
  const res = await fetch('/api/feed/birthdays');
  if (!res.ok) throw new Error('Failed to fetch birthday feed');
  return res.json() as Promise<BirthdayFeed>;
}
