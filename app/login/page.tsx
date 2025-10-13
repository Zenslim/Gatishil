import { redirect } from 'next/navigation';

import LoginClient from './LoginClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export default async function LoginPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    redirect('/dashboard');
  }

  return <LoginClient />;
}
