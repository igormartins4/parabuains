'use client';
import { useState } from 'react';
import { useSSENotifications } from '@/hooks/useSSENotifications';

export function NotificationBadge() {
  const [count, setCount] = useState(0);

  useSSENotifications((event) => {
    if (event.type === 'friendship_request' || event.type === 'friendship_accepted') {
      setCount((c) => c + 1);
    }
  });

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-rose-500 rounded-full">
      {count > 9 ? '9+' : count}
    </span>
  );
}
