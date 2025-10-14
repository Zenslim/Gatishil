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
      {/* Gentle helper text to remove confusion about passwords vs. passkeys */}
      <div className="px-4">
        <div className="mx-auto max-w-md mt-4 text-center text-sm text-white/70">
          <p>
            <strong>Tip:</strong> If you never created a password for this account,
            click <span className="underline underline-offset-2">Forgot Password</span> to set one now.
            You can also tap <span className="whitespace-nowrap">🖐️ Use Biometric</span> to sign in with your passkey,
            or use the <span className="whitespace-nowrap">“Email me a magic link”</span> option.
          </p>
          <p className="mt-3">
            Passkeys use your device’s built-in authenticator (Face ID, Touch ID, Android Biometric Prompt, or Windows Hello on laptops and desktops).
          </p>
          <p className="mt-2">
            If biometric isn’t available, use your 4-digit PIN.
          </p>
        </div>
      </div>
    </>
  );
}
