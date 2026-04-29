'use client';

import { useState } from 'react';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
}

export function TwoFactorVerify({
  onSuccess,
  onCancel,
  title = 'Verificacao de dois fatores',
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleVerify() {
    if (!code.trim()) { setError('Digite o codigo'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!data.verified) throw new Error(data.error || 'Codigo invalido');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Codigo invalido');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {!isBackupCode ? (
        <>
          <p className="text-sm text-gray-600">Digite o codigo de 6 digitos do seu app autenticador:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button onClick={() => setIsBackupCode(true)} className="text-xs text-violet-600 hover:underline">
            Usar codigo de recuperacao
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Digite um dos seus codigos de recuperacao:</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXXXX"
            maxLength={10}
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button onClick={() => setIsBackupCode(false)} className="text-xs text-violet-600 hover:underline">
            Usar codigo do autenticador
          </button>
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
        )}
        <button
          onClick={handleVerify}
          disabled={isLoading || !code.trim()}
          className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? 'Verificando...' : 'Verificar'}
        </button>
      </div>
    </div>
  );
}
