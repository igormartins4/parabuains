'use client';

import { useState } from 'react';
import type { WallSettingsData } from '@/lib/api/messages';

interface WallSettingsFormProps {
  initialSettings: WallSettingsData;
}

export function WallSettingsForm({ initialSettings }: WallSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/wall/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50"
    >
      {/* who_can_post */}
      <fieldset>
        <legend className="mb-3 text-base font-medium text-zinc-900 dark:text-zinc-100">
          Quem pode postar no seu mural
        </legend>
        <div className="space-y-2">
          {[
            {
              value: 'friends',
              label: 'Apenas amigos',
              desc: 'Só quem é seu amigo pode deixar mensagens',
            },
            {
              value: 'authenticated',
              label: 'Qualquer usuário autenticado',
              desc: 'Qualquer pessoa logada pode postar',
            },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <input
                type="radio"
                name="wallWhoCanPost"
                value={opt.value}
                checked={settings.wallWhoCanPost === opt.value}
                onChange={() =>
                  setSettings((s) => ({
                    ...s,
                    wallWhoCanPost: opt.value as 'friends' | 'authenticated',
                  }))
                }
                className="mt-0.5"
              />
              <div>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {opt.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* allow_anonymous */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Permitir mensagens anônimas
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            O remetente pode ocultar sua identidade ao enviar
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.wallAllowAnonymous}
          onClick={() => setSettings((s) => ({ ...s, wallAllowAnonymous: !s.wallAllowAnonymous }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.wallAllowAnonymous ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.wallAllowAnonymous ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* require_approval */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Aprovar mensagens antes de publicar
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mensagens ficam pendentes até você aprovar
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.wallRequireApproval}
          onClick={() =>
            setSettings((s) => ({ ...s, wallRequireApproval: !s.wallRequireApproval }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.wallRequireApproval ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.wallRequireApproval ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {saveStatus === 'saved' && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          Configurações salvas!
        </p>
      )}
      {saveStatus === 'error' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Erro ao salvar. Tente novamente.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  );
}
