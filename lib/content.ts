import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';

export type HomeContentRecord = {
  slug: string;
  category: string;
  title_en: string | null;
  title_np: string | null;
  body_en: string | null;
  body_np: string | null;
};

export type HomeContentPatch = Partial<Record<'title_en' | 'title_np' | 'body_en' | 'body_np', string>>;

const CONTENT_FIELDS = 'slug, category, title_en, title_np, body_en, body_np';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getContentBySlug(slug: string): Promise<HomeContentRecord | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('content')
    .select(CONTENT_FIELDS)
    .eq('slug', slug)
    .maybeSingle<HomeContentRecord>();

  if (error) {
    console.error('getContentBySlug error', error);
    return null;
  }

  return data ?? null;
}

export async function updateContentBySlug(slug: string, patch: HomeContentPatch) {
  'use server';

  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return null;
  }

  const updatePayload = Object.fromEntries(entries);
  const cookieStore = cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
    },
  });

  const { data, error } = await supabase
    .from('content')
    .update(updatePayload)
    .eq('slug', slug)
    .select(CONTENT_FIELDS)
    .maybeSingle<HomeContentRecord>();

  if (error) {
    console.error('updateContentBySlug', error);
    throw new Error('UPDATE_FAILED');
  }

  if (slug === 'home') {
    revalidatePath('/');
  } else {
    revalidatePath(`/${slug}`);
  }

  return data ?? null;
}
