'use client';

import { useTransition } from 'react';
import { updatePrivacyAction } from '@/app/settings/profile/actions';

interface BirthYearToggleProps {
  birthYearHidden: boolean;
}

export function BirthYearToggle({ birthYearHidden }: BirthYearToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const formData = new FormData();
    formData.set('birthYearHidden', String(!birthYearHidden));
    startTransition(() => {
      void updatePrivacyAction(formData);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Ocultar ano de nascimento</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Não-amigos verão apenas dia e mês (ex: &quot;15 de março&quot;). Amigos podem ver o ano
          completo se esta opção estiver desativada.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={birthYearHidden}
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
          birthYearHidden ? 'bg-pink-600' : 'bg-gray-200'
        } disabled:opacity-50`}
        aria-label="Ocultar ano de nascimento"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            birthYearHidden ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
