'use client';

import { useState } from 'react';
import { PushPermissionModal } from '@/components/notifications/PushPermissionModal';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface NotificationPreference {
  channel: 'email' | 'push';
  daysBefore: number[];
  enabled: boolean;
}

interface NotificationsSettingsFormProps {
  initialPreferences: NotificationPreference[];
}

const REMINDER_OPTIONS = [
  { days: 7, label: '7 dias antes' },
  { days: 3, label: '3 dias antes' },
  { days: 1, label: '1 dia antes' },
  { days: 0, label: 'No dia' },
];

export function NotificationsSettingsForm({ initialPreferences }: NotificationsSettingsFormProps) {
  const emailPref = initialPreferences.find((p) => p.channel === 'email') ?? {
    channel: 'email' as const,
    daysBefore: [1, 7],
    enabled: false,
  };

  const [emailEnabled, setEmailEnabled] = useState(emailPref.enabled);
  const [emailDaysBefore, setEmailDaysBefore] = useState(emailPref.daysBefore);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);

  const { isSupported: pushSupported, isSubscribed: pushSubscribed, permission } = usePushNotifications();

  async function savePreference(channel: 'email' | 'push', daysBefore: number[], enabled: boolean) {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, daysBefore, enabled }),
      });
      if (!res.ok) throw new Error(`Erro ao salvar: ${res.status}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEmailToggle(enabled: boolean) {
    setEmailEnabled(enabled);
    void savePreference('email', emailDaysBefore, enabled);
  }

  function handleDaysBeforeToggle(days: number) {
    const newDays = emailDaysBefore.includes(days)
      ? emailDaysBefore.filter((d) => d !== days)
      : [...emailDaysBefore, days];
    setEmailDaysBefore(newDays);
    void savePreference('email', newDays, emailEnabled);
  }

  return (
    <div className="space-y-6">
      {/* Success/Error feedback */}
      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Preferências salvas com sucesso.
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {saveError}
        </div>
      )}

      {/* ── Email Notifications ─────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Notificações por e-mail
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Receba lembretes de aniversário, mensagens no mural e pedidos de amizade.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={emailEnabled}
              onChange={(e) => handleEmailToggle(e.target.checked)}
              disabled={isSaving}
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
          </label>
        </div>

        {emailEnabled && (
          <div className="border-t border-zinc-100 dark:border-zinc-700 pt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Lembretes de aniversário
            </p>
            <div className="space-y-2">
              {REMINDER_OPTIONS.map(({ days, label }) => (
                <label key={days} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailDaysBefore.includes(days)}
                    onChange={() => handleDaysBeforeToggle(days)}
                    disabled={isSaving}
                    className="w-4 h-4 text-indigo-600 bg-zinc-100 border-zinc-300 rounded focus:ring-indigo-500 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Push Notifications ──────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Notificações push
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Receba notificações no seu navegador, mesmo sem ter o site aberto.
            </p>
          </div>
          {pushSupported ? (
            <div className="flex items-center gap-2">
              {pushSubscribed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Ativo
                </span>
              ) : (
                <button
                  onClick={() => setShowPushModal(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Ativar
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs text-zinc-400">Não suportado neste navegador</span>
          )}
        </div>

        {permission === 'denied' && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
            As notificações push estão bloqueadas. Habilite-as nas configurações do seu navegador.
          </p>
        )}
      </section>

      <PushPermissionModal isOpen={showPushModal} onClose={() => setShowPushModal(false)} />
    </div>
  );
}
