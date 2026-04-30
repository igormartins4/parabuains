'use client';

import { useState } from 'react';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
}

interface SetupData {
  totpURI: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export function TwoFactorSetup({ onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'confirm' | 'qr' | 'backup' | 'verify'>('confirm');
  const [password, setPassword] = useState('');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backupCopied, setBackupCopied] = useState(false);

  async function handleStartSetup() {
    if (!password) {
      setError('Digite sua senha para continuar');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro ao configurar 2FA');
      }
      const data: SetupData = await res.json();
      setSetupData(data);
      setStep('qr');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyTotp() {
    if (totpCode.length !== 6) {
      setError('Digite o codigo de 6 digitos');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!data.verified) throw new Error('Codigo invalido');
      setStep('backup');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopyBackupCodes() {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setBackupCopied(true);
    setTimeout(() => setBackupCopied(false), 2000);
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Para ativar o 2FA, confirme sua senha:</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha atual"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleStartSetup}
          disabled={isLoading}
          className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? 'Gerando...' : 'Continuar'}
        </button>
      </div>
    );
  }

  if (step === 'qr' && setupData) {
    const manualCode = new URL(setupData.totpURI).searchParams.get('secret') ?? '';
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.):
        </p>
        <div className="flex justify-center">
          {/* biome-ignore lint/performance/noImgElement: OG route uses @vercel/og ImageResponse which requires plain <img>, not next/image */}
          <img
            src={setupData.qrCodeDataUrl}
            alt="QR Code 2FA"
            className="rounded-lg border border-gray-200 p-2"
            width={200}
            height={200}
          />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-violet-600">
            Nao consigo escanear — mostrar codigo manual
          </summary>
          <code className="mt-2 block break-all rounded bg-gray-100 p-2 font-mono text-xs">
            {manualCode}
          </code>
        </details>
        <div className="space-y-2">
          <label htmlFor="totp-code-setup" className="text-sm font-medium text-gray-700">
            Codigo do app (6 digitos):
          </label>
          <input
            id="totp-code-setup"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-label="Codigo de verificação do autenticador"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleVerifyTotp}
          disabled={isLoading || totpCode.length !== 6}
          className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? 'Verificando...' : 'Verificar e ativar'}
        </button>
      </div>
    );
  }

  if (step === 'backup' && setupData) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-800">
            Salve estes codigos de recuperacao agora!
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Eles nao serao mostrados novamente. Use-os se perder acesso ao seu app autenticador.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {setupData.backupCodes.map((code, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static backup codes list — order never changes
            <code key={i} className="rounded bg-gray-100 px-3 py-1.5 font-mono text-sm text-center">
              {code}
            </code>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopyBackupCodes}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {backupCopied ? 'Copiado!' : 'Copiar todos os codigos'}
        </button>
        <button
          type="button"
          onClick={() => onSuccess?.()}
          className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Concluir ativacao
        </button>
      </div>
    );
  }

  return null;
}
