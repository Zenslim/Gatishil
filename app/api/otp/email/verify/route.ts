// Delegates to working lib/otp.ts: handleVerify (supports email or phone verify)
import { handleVerify } from '@/lib/otp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    return await handleVerify(req)
  } catch (e: any) {
    console.error('otp/verify route error:', e?.message || e)
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
