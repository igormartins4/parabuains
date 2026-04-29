import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

export default async function TwoFactorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Autenticacao de dois fatores</h1>
      <p className="mb-6 text-sm text-gray-600">
        Proteja sua conta com um codigo gerado pelo seu app autenticador.
      </p>
      {session.user.twoFactorEnabled ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">2FA esta ativo na sua conta.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <TwoFactorSetup onSuccess={() => {}} />
        </div>
      )}
    </div>
  );
}
