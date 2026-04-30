import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-center">
      <span className="text-6xl" role="img" aria-label="bolo de aniversário">
        🎂
      </span>
      <h1 className="text-2xl font-bold mt-6 mb-2">Perfil não encontrado</h1>
      <p className="text-gray-500 mb-8">Este perfil não existe ou pode ter mudado de username.</p>
      <Link
        href="/"
        className="inline-flex items-center px-6 py-3 rounded-full bg-pink-600 text-white font-medium hover:bg-pink-700 transition-colors"
      >
        Voltar para o início
      </Link>
    </main>
  );
}
