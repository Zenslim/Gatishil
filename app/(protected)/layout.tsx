import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return <>{children}</>;
}
