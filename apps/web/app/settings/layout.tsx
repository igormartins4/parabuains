import Link from 'next/link';
import type { ReactNode } from 'react';

const settingsLinks = [
  { href: '/settings/profile', label: 'Perfil' },
  { href: '/settings/notifications', label: 'Notificações' },
  { href: '/settings/wall', label: 'Mural' },
  { href: '/settings/two-factor', label: 'Segurança (2FA)' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar navigation */}
          <aside className="w-full md:w-52 shrink-0">
            <nav aria-label="Menu de configurações" className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {settingsLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Page content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
