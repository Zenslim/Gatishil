import type { User } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';

const EDIT_ROLES = new Set(['editor', 'admin']);

export async function canEditContent(user: User | null | undefined): Promise<boolean> {
  if (!user?.id) return false;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>();

  if (error) {
    console.error('canEditContent error', error);
    return false;
  }

  const role = data?.role ?? null;
  return typeof role === 'string' && EDIT_ROLES.has(role);
}
