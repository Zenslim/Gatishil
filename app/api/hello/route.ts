export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = false;

export async function GET() {
  return new Response(JSON.stringify({ ok: true, msg: 'API is alive' }), {
    headers: { 'content-type': 'application/json' }
  });
}
