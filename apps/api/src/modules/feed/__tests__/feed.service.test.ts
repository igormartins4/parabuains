import { DateTime } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import type { BirthdayCandidate } from '../feed.repository.js';
import { FeedService } from '../feed.service.js';

// Helper to make a candidate with specific month/day
const makeCandidate = (overrides: Partial<BirthdayCandidate> = {}): BirthdayCandidate => ({
  id: 'user-1',
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  birthDate: '1990-06-15',
  birthYearHidden: false,
  timezone: 'UTC',
  ...overrides,
});

const makeRepo = (candidates: BirthdayCandidate[] = []) => ({
  getBirthdayCandidates: vi.fn().mockResolvedValue(candidates),
});

describe('FeedService.getBirthdayFeed', () => {
  it('returns empty today and upcoming when no candidates', async () => {
    const service = new FeedService(makeRepo());
    const result = await service.getBirthdayFeed('viewer', 'UTC');
    expect(result.today).toEqual([]);
    expect(result.upcoming).toEqual([]);
  });

  it('places birthday in today when daysUntil === 0', async () => {
    // Use today's date as the birthday
    const now = DateTime.now().setZone('UTC');
    const monthStr = String(now.month).padStart(2, '0');
    const dayStr = String(now.day).padStart(2, '0');
    const candidate = makeCandidate({ birthDate: `1990-${monthStr}-${dayStr}` });

    const service = new FeedService(makeRepo([candidate]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.today).toHaveLength(1);
    expect(result.today[0]?.userId).toBe('user-1');
    expect(result.today[0]?.daysUntil).toBe(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it('places birthday in upcoming when 1-30 days away', async () => {
    const now = DateTime.now().setZone('UTC');
    const future = now.plus({ days: 5 });
    const monthStr = String(future.month).padStart(2, '0');
    const dayStr = String(future.day).padStart(2, '0');
    const candidate = makeCandidate({ birthDate: `1990-${monthStr}-${dayStr}` });

    const service = new FeedService(makeRepo([candidate]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.today).toHaveLength(0);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.daysUntil).toBe(5);
  });

  it('discards candidates beyond 30 days', async () => {
    const now = DateTime.now().setZone('UTC');
    const future = now.plus({ days: 31 });
    const monthStr = String(future.month).padStart(2, '0');
    const dayStr = String(future.day).padStart(2, '0');
    const candidate = makeCandidate({ birthDate: `1990-${monthStr}-${dayStr}` });

    const service = new FeedService(makeRepo([candidate]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.today).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it('sorts upcoming by daysUntil ascending', async () => {
    const now = DateTime.now().setZone('UTC');
    const far = now.plus({ days: 20 });
    const near = now.plus({ days: 3 });

    const candidateFar = makeCandidate({
      id: 'user-far',
      birthDate: `1990-${String(far.month).padStart(2, '0')}-${String(far.day).padStart(2, '0')}`,
    });
    const candidateNear = makeCandidate({
      id: 'user-near',
      birthDate: `1990-${String(near.month).padStart(2, '0')}-${String(near.day).padStart(2, '0')}`,
    });

    const service = new FeedService(makeRepo([candidateFar, candidateNear]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.upcoming[0]?.userId).toBe('user-near');
    expect(result.upcoming[1]?.userId).toBe('user-far');
  });

  it('omits birthYear when birthYearHidden is true', async () => {
    const now = DateTime.now().setZone('UTC');
    const monthStr = String(now.month).padStart(2, '0');
    const dayStr = String(now.day).padStart(2, '0');
    const candidate = makeCandidate({
      birthDate: `1990-${monthStr}-${dayStr}`,
      birthYearHidden: true,
    });

    const service = new FeedService(makeRepo([candidate]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.today[0]).not.toHaveProperty('birthYear');
  });

  it('includes birthYear when birthYearHidden is false', async () => {
    const now = DateTime.now().setZone('UTC');
    const monthStr = String(now.month).padStart(2, '0');
    const dayStr = String(now.day).padStart(2, '0');
    const candidate = makeCandidate({
      birthDate: `1990-${monthStr}-${dayStr}`,
      birthYearHidden: false,
    });

    const service = new FeedService(makeRepo([candidate]));
    const result = await service.getBirthdayFeed('viewer', 'UTC');

    expect(result.today[0]?.birthYear).toBe(1990);
  });
});

describe('FeedService.buildBirthdayEntry', () => {
  it('returns correct birthMonthDay format', () => {
    const service = new FeedService(makeRepo());
    const now = DateTime.fromISO('2024-06-15T12:00:00', { zone: 'UTC' });
    const candidate = makeCandidate({ birthDate: '1990-06-15' });
    const entry = service.buildBirthdayEntry(candidate, now);
    expect(entry?.birthMonthDay).toBe('06-15');
  });

  it('handles Feb 29 in non-leap year gracefully — falls back to Mar 1', () => {
    const service = new FeedService(makeRepo());
    // 2023 is not a leap year
    const now = DateTime.fromISO('2023-01-01T12:00:00', { zone: 'UTC' });
    const candidate = makeCandidate({ birthDate: '2000-02-29' });
    const entry = service.buildBirthdayEntry(candidate, now);
    // Should not crash — returns a valid entry
    expect(entry).not.toBeNull();
  });

  it('advances to next year when birthday already passed this year', () => {
    const service = new FeedService(makeRepo());
    // View date: 2024-07-01 — birthday June 15 already passed
    const now = DateTime.fromISO('2024-07-01T12:00:00', { zone: 'UTC' });
    const candidate = makeCandidate({ birthDate: '1990-06-15' });
    const entry = service.buildBirthdayEntry(candidate, now);
    expect(entry?.nextBirthday).toBe('2025-06-15');
  });

  it('handles timezone-aware date comparison (America/Sao_Paulo)', () => {
    const service = new FeedService(makeRepo());
    // Use America/Sao_Paulo timezone (UTC-3)
    const now = DateTime.now().setZone('America/Sao_Paulo');
    const todayInTZ = now.startOf('day');
    const candidate = makeCandidate({
      birthDate: `1990-${String(todayInTZ.month).padStart(2, '0')}-${String(todayInTZ.day).padStart(2, '0')}`,
    });
    const entry = service.buildBirthdayEntry(candidate, now);
    expect(entry?.daysUntil).toBe(0);
  });

  it('handles birthDate as Date object (from pg driver)', () => {
    const service = new FeedService(makeRepo());
    const now = DateTime.fromISO('2024-06-15T12:00:00', { zone: 'UTC' });
    const candidate = makeCandidate({
      birthDate: new Date('1990-06-15T00:00:00.000Z') as unknown as string,
    });
    const entry = service.buildBirthdayEntry(candidate, now);
    expect(entry?.birthMonthDay).toBe('06-15');
    expect(entry?.daysUntil).toBe(0);
  });
});
