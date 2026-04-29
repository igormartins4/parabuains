export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-brand-purple">
        🎂 Parabuains
      </h1>
      <p className="text-lg text-gray-600">
        Nunca mais esqueça um aniversário.
      </p>
      <p className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-medium text-gray-900">
        Stack: Next.js + Fastify v5 + PostgreSQL + Drizzle + BullMQ
      </p>
    </main>
  );
}
