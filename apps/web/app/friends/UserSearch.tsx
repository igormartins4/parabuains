'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FriendshipStatus } from '@/lib/api/friendships';
import { searchUsers, sendFriendRequest } from '@/lib/api/friendships';

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  friendshipStatus: FriendshipStatus;
}

interface SearchResponse {
  results?: SearchResult[];
  nextCursor?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, FriendshipStatus>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const doSearch = useCallback(async (q: string, cursor?: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = (await searchUsers(q, cursor)) as SearchResponse;
      const newResults: SearchResult[] = data.results ?? [];
      setResults((prev) => (cursor ? [...prev, ...newResults] : newResults));
      setNextCursor(data.nextCursor ?? null);
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setResults([]);
    setNextCursor(null);
    void doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && nextCursor) {
          void doSearch(debouncedQuery, nextCursor);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loading, debouncedQuery, doSearch]);

  const handleAddFriend = async (userId: string) => {
    try {
      setStatuses((prev) => ({ ...prev, [userId]: 'pending_sent' }));
      await sendFriendRequest(userId);
    } catch {
      setStatuses((prev) => ({ ...prev, [userId]: 'none' }));
    }
  };

  const getStatus = (result: SearchResult): FriendshipStatus =>
    statuses[result.id] ?? result.friendshipStatus;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou @username..."
        className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Buscar usuários"
      />

      {loading && query.length >= 2 && (
        <div className="mt-2 space-y-2">
          {[...Array(3)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list — index is stable and intentional
            <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <ul className="mt-2 space-y-2">
          {results.map((result) => {
            const status = getStatus(result);
            return (
              <li
                key={result.id}
                className="flex items-center gap-3 p-3 bg-white border border-neutral-100 rounded-xl"
              >
                <Link href={`/${result.username}`} className="shrink-0">
                  {result.avatarUrl ? (
                    <Image
                      src={result.avatarUrl}
                      alt={result.displayName}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-semibold text-neutral-600 text-sm">
                      {result.displayName.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{result.displayName}</p>
                  <p className="text-xs text-neutral-500">@{result.username}</p>
                </div>
                {status === 'none' && (
                  <button
                    type="button"
                    onClick={() => void handleAddFriend(result.id)}
                    className="shrink-0 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Adicionar
                  </button>
                )}
                {status === 'pending_sent' && (
                  <span className="shrink-0 px-3 py-1.5 text-sm text-neutral-500 border border-neutral-200 rounded-lg">
                    Pendente
                  </span>
                )}
                {status === 'pending_received' && (
                  <span className="shrink-0 px-3 py-1.5 text-sm text-amber-600 border border-amber-200 rounded-lg">
                    Responder
                  </span>
                )}
                {status === 'accepted' && (
                  <span className="shrink-0 px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg">
                    Amigos
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="h-1" />

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="text-center text-neutral-500 py-6 text-sm">
          Nenhum usuário encontrado para &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
