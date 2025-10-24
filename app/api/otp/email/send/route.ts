// app/api/otp/email/send/route.ts
import { handleSendEmail } from '@/lib/otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleSendEmail(req);
  } catch (e: any) {
    console.error('OTP email/send error:', e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
