'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Honeypot check — bot filled the hidden field
    if (honeypot) {
      await new Promise((r) => setTimeout(r, 800));
      return;
    }

    setLoading(true);
    try {
      await signIn.email({ email, password, callbackURL: '/' });
    } catch {
      setError('E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">Entrar</h2>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">ou</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleSignInButton />

      <div className="mt-4 space-y-2 text-center text-sm">
        <p>
          <Link href="/forgot-password" className="text-indigo-600 hover:underline">
            Esqueceu a senha?
          </Link>
        </p>
        <p className="text-gray-600">
          Não tem conta?{' '}
          <Link href="/register" className="text-indigo-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
