import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export class VapidTransport {
  constructor(publicKey: string, privateKey: string, subject: string) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async sendPushNotification(
    subscription: PushSubscriptionKeys,
    payload: PushPayload,
  ): Promise<'sent' | 'invalid_endpoint'> {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      return 'sent';
    } catch (err) {
      const statusCode =
        err instanceof Error && 'statusCode' in err
          ? (err as { statusCode: number }).statusCode
          : null;

      // 404 (endpoint gone) or 410 (subscription expired) = invalid endpoint
      if (statusCode === 404 || statusCode === 410) {
        return 'invalid_endpoint';
      }

      throw err;
    }
  }
}
