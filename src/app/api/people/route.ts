import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (!supabase) {
      return Response.json({
        source: 'demo',
        people: [
          { id: 'demo-1', name: 'First Citizen', role: 'Coordinator', email: 'first@example.com' },
          { id: 'demo-2', name: 'Second Citizen', role: 'Mobilizer', email: 'second@example.com' }
        ]
      });
    }
    const { data, error } = await supabase.from('people').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json({ source: 'supabase', people: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    return new Response(JSON.stringify({ source: 'error', message }), { status: 500 });
  }
}