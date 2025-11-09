import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supa = getSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return <>{children}</>;
}
