import { redirect } from 'next/navigation';

import JoinClient from './JoinClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function JoinPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    redirect('/onboard?src=join');
  }

  return <JoinClient />;
}
