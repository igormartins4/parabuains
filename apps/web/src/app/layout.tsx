import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Parabuains — Nunca mais esqueça um aniversário',
  description:
    'Compartilhe sua data de aniversário, receba lembretes e celebre com amigos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
