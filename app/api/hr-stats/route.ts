import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabase();
  const get = async (table: string) => (await supabase.from(table).select('*', { count: 'exact', head: true })).count ?? 0;

  const out = {
    people: await get('people'),
    education: await get('person_education'),
    history: await get('person_history'),
    links: await get('person_links'),
    orgs: await get('orgs'),
    circles: await get('circles'),
    socials: await get('person_socials'),
    notes: await get('person_notes'),
    grades: await get('person_grades'),
    projects: await get('projects'),
    person_projects: await get('person_projects'),
    vettings: await get('vettings'),
  };

  return NextResponse.json(out, { status: 200 });
}
