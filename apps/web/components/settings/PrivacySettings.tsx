'use client';

import { useTransition } from 'react';
import { updatePrivacyAction } from '@/app/settings/profile/actions';

interface PrivacySettingsProps {
  privacyLevel: 'public' | 'friends' | 'private';
  countdownVisibility: 'public' | 'friends';
}

const PRIVACY_OPTIONS = [
  {
    value: 'public' as const,
    label: 'Público',
    description: 'Qualquer pessoa pode ver seu perfil completo',
    icon: '🌎',
  },
  {
    value: 'friends' as const,
    label: 'Só amigos',
    description: 'Não-amigos veem apenas nome e foto',
    icon: '👥',
  },
  {
    value: 'private' as const,
    label: 'Privado',
    description: 'Perfil oculto para quem não é seu amigo',
    icon: '🔒',
  },
];

const COUNTDOWN_OPTIONS = [
  { value: 'public' as const, label: 'Público', description: 'Visível para todos' },
  { value: 'friends' as const, label: 'Só amigos', description: 'Oculto para desconhecidos' },
];

export function PrivacySettings({ privacyLevel, countdownVisibility }: PrivacySettingsProps) {
  const [isPending, startTransition] = useTransition();

  function handlePrivacyChange(newPrivacyLevel: string) {
    const formData = new FormData();
    formData.set('privacyLevel', newPrivacyLevel);
    startTransition(() => { void updatePrivacyAction(formData); });
  }

  function handleCountdownChange(newVisibility: string) {
    const formData = new FormData();
    formData.set('countdownVisibility', newVisibility);
    startTransition(() => { void updatePrivacyAction(formData); });
  }

  return (
    <div className="space-y-6">
      {/* Privacy level */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Visibilidade do perfil</h3>
        <div className="space-y-2">
          {PRIVACY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                privacyLevel === option.value
                  ? 'border-pink-300 bg-pink-50'
                  : 'border-gray-200 hover:bg-gray-50'
              } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name="privacyLevel"
                value={option.value}
                checked={privacyLevel === option.value}
                onChange={() => handlePrivacyChange(option.value)}
                className="mt-0.5 accent-pink-600"
              />
              <div>
                <span className="text-sm font-medium">
                  {option.icon} {option.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Countdown visibility */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Visibilidade da contagem regressiva
        </h3>
        <div className="space-y-2">
          {COUNTDOWN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                countdownVisibility === option.value
                  ? 'border-pink-300 bg-pink-50'
                  : 'border-gray-200 hover:bg-gray-50'
              } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name="countdownVisibility"
                value={option.value}
                checked={countdownVisibility === option.value}
                onChange={() => handleCountdownChange(option.value)}
                className="mt-0.5 accent-pink-600"
              />
              <div>
                <span className="text-sm font-medium">{option.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {isPending && <p className="text-xs text-gray-500 animate-pulse">Salvando...</p>}
    </div>
  );
}
