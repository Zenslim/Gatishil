import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function safeNext(searchParams?: Record<string, string | string[] | undefined>) {
  const raw = (searchParams?.next && typeof searchParams.next === 'string')
    ? searchParams.next
    : undefined;
  if (raw && raw.startsWith('/')) return raw;
  return '/dashboard';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    redirect(safeNext(searchParams));
  }

  return (
    <>
      <LoginClient />
      <div className="px-4">
        <div className="mx-auto max-w-md mt-4 text-center text-sm text-white/70">
          <p>
            <strong>Tip:</strong> If you never created a password for this account,
            tap <span className="underline underline-offset-2">Forgot Password</span> or request a one-time code.
          </p>
          <p className="mt-3">
            Biometric sign-in is supported by your device. When it isn’t available, use your 4–8 digit PIN.
          </p>
        </div>
      </div>
    </>
  );
}
