'use client';
import { useEffect, useRef } from 'react';

export type SSEEventType = 'friendship_request' | 'friendship_accepted';

export interface SSEEvent {
  type: SSEEventType;
  [key: string]: unknown;
}

export function useSSENotifications(onEvent: (event: SSEEvent) => void, enabled = true) {
  // Use a ref so we don't need to list onEvent in deps (avoids infinite loops
  // when callers pass an inline function)
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource('/api/notifications/stream');

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as SSEEvent;
        onEventRef.current(data);
      } catch {
        // Ignore non-JSON messages (heartbeats arrive as SSE comments, not onmessage)
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects — no extra logic needed
    };

    return () => es.close();
  }, [enabled]);
}
