import HomePageClient from '@/components/home/HomePageClient';
import type { HomeContentPatch, HomeContentRecord } from '@/lib/content';
import { getContentBySlug, updateContentBySlug } from '@/lib/content';
import { canEditContent } from '@/lib/authz';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const content = await getContentBySlug('home');
  const supabase = getSupabaseServer();
  const {
    data: { user } = { user: null },
  } = await supabase.auth.getUser();

  const editable = user ? await canEditContent(user) : false;

  const fallback: HomeContentRecord =
    content ?? {
      slug: 'home',
      category: 'page',
      title_en: 'Gatishil Nepal',
      title_np: null,
      body_en:
        '<p>Welcome to Gatishil Nepal. No homepage content has been published yet.</p>',
      body_np: null,
    };

  const savePatch = async (patch: HomeContentPatch) => {
    'use server';
    return updateContentBySlug('home', patch);
  };

  return <HomePageClient initialContent={fallback} canEdit={editable} onSave={savePatch} />;
}
