import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  if (session?.user) {
    // Logged in: redirect to feed
    const { redirect } = await import('next/navigation');
    redirect('/feed');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 bg-white">
      <h1 className="text-4xl font-bold text-brand-purple">🎂 Parabuains</h1>
      <p className="text-lg text-gray-600 text-center max-w-sm">
        Nunca mais esqueça um aniversário. Celebre com quem importa.
      </p>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-full bg-brand-purple px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
