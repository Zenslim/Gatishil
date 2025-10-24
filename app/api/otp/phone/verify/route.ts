// app/api/otp/phone/verify/route.ts
import { handleVerifyPhone } from '@/lib/otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleVerifyPhone(req);
  } catch (e: any) {
    console.error('OTP phone/verify error:', e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
