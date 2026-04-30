'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe(): Promise<void>;
  unsubscribe(): Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    setPermission(Notification.permission);

    // Check if already subscribed
    void navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) throw new Error('Push notifications not supported');

    setIsLoading(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Subscribe to push
      const vapidKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
      if (!vapidKey) throw new Error('VAPID public key not configured');

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      setPermission(Notification.permission);

      const json = subscription.toJSON();
      const p256dh = json.keys?.['p256dh'];
      const auth = json.keys?.['auth'];

      if (!p256dh || !auth) throw new Error('Invalid push subscription keys');

      // Save to server via BFF
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server rejected subscription: ${response.status}`);
      }

      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        // Remove from server via BFF
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
