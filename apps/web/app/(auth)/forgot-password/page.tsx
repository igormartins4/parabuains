'use client';

import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Honeypot check — bot filled the hidden field
    if (honeypot) {
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    } finally {
      // SEMPRE mostrar sucesso para não revelar se email existe
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm text-center">
        <div className="mb-3 text-4xl">📬</div>
        <h2 className="text-lg font-semibold text-gray-900">E-mail enviado</h2>
        <p className="mt-2 text-sm text-gray-600">
          Se houver uma conta com esse e-mail, você receberá instruções para redefinir sua senha.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">Esqueceu a senha?</h2>
      <p className="mb-6 text-center text-sm text-gray-500">
        Informe seu e-mail e enviaremos as instruções.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from humans */}
        <input
          type="text"
          name="website"
          aria-hidden="true"
          tabIndex={-1}
          style={{ position: 'absolute', left: '-9999px' }}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
        />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar instruções'}
        </button>
      </form>
    </div>
  );
}
