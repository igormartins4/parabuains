'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
      await signUp.email({ name, email, password, callbackURL: '/verify-email' });
      setSuccess(true);
    } catch {
      setError('Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm text-center">
        <div className="mb-3 text-4xl">📧</div>
        <h2 className="text-lg font-semibold text-gray-900">Verifique seu e-mail</h2>
        <p className="mt-2 text-sm text-gray-600">
          Verifique seu e-mail para ativar sua conta.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Já verificou?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">Criar conta</h2>

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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">Mínimo de 8 caracteres</p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">ou</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleSignInButton />

      <p className="mt-4 text-center text-sm text-gray-600">
        Já tem conta?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
